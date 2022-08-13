import { Item, ShopModel } from '../schemas/Shop';
import type { MongooseDocument } from './Inventory';
import { createId } from '../util/crypto';
import type { GuildMemberRoleManager } from 'discord.js';
import { Inventory } from './Inventory';
import { Economy } from './Economy';

export class Shop {
	private inventory = new Inventory();
	private economy = new Economy();

	public async getShop(guildId: string, raw?: false): Promise<Item[]>;
	// @ts-expect-error
	public async getShop(guildId: string, raw: true): Promise<MongooseDocument>;
	public async getShop(guildId: string, raw?: false) {
		let shop = await ShopModel.findOne({ guildId });
		if (!shop) shop = await ShopModel.create({ guildId });

		if (raw) return shop;
		else return shop.items;
	}

	public async addItem(guildId: string, item: Omit<Item, '_id'>) {
		const shop = await this.getShop(guildId, true);

		let id: string;

		do {
			id = createId();
		} while (shop.items.some(i => i._id === id));

		shop.items.push({ ...item, _id: '' });
		await shop.save();

		return {
			success: true,
			message: 'Item added',
			code: 0
		};
	}

	public async removeItem(guildId: string, itemId: string) {
		const shop = await this.getShop(guildId, true);

		const item = shop.items.find(i => i._id === itemId);
		if (!item)
			return {
				success: false,
				message: 'Item not found',
				code: 1
			};

		shop.items = shop.items.filter(i => i._id !== itemId);
		await shop.save();

		return {
			success: true,
			message: 'Item removed',
			code: 0
		};
	}

	public async updateItem(
		guildId: string,
		itemId: string,
		item: Partial<Omit<Item, '_id'>>
	) {
		const shop = await this.getShop(guildId, true);

		const existingItem = shop.items.find(i => i._id === itemId);
		if (!existingItem)
			return {
				success: false,
				message: 'Item not found',
				code: 1
			};

		const index = shop.items.findIndex(i => i._id === itemId);
		shop.items.splice(index, 1, { ...existingItem, ...item });
		await shop.save();

		return {
			success: true,
			message: 'Item updated',
			code: 0,
			item: shop.items[index]
		};
	}

	public async buyItem(
		userId: string,
		guildId: string,
		itemId: string,
		{
			units,
			roleManager
		}: { units: number; roleManager?: GuildMemberRoleManager } = {
			units: 1,
			roleManager: undefined
		}
	) {
		const shop = await this.getShop(guildId, true);

		const item = shop.items.find(i => i._id === itemId);
		if (!item)
			return {
				success: false,
				message: 'Item not found',
				code: 1
			};

		if (item.stock && item.stock < units) {
			return {
				success: false,
				message: 'Not enough stock',
				code: 2
			};
		}

		const inv = await this.inventory.getInventory(userId, guildId, true);

		const existingItem = inv.items.some(i => i._id === itemId);
		if (existingItem && item.unique)
			return {
				success: false,
				message: 'You can only have one of this item',
				code: 3
			};
		if (roleManager && item.roleRequired) {
			const hasRole = roleManager.cache.some(r => r.id === item.roleRequired);
			if (!hasRole)
				return {
					success: false,
					message: 'You do not have the required role',
					code: 4
				};
		}

		let moneyToRemove = 0;

		if (item.stock && item.stock < units) {
			return {
				success: false,
				message: 'Not enough stock',
				code: 5
			};
		}

		for (let i = 0; i < units; i++) {
			inv.items.push(item);
			moneyToRemove += item.price;
		}

		const balance = await this.economy.balance(userId, guildId);

		if (balance.cash < moneyToRemove) {
			return {
				success: false,
				message: 'Not enough money',
				code: 6
			};
		}

		await inv.save();
		await this.economy.removeMoney(userId, guildId, moneyToRemove);

		if (item.stock)
			await this.updateItem(guildId, itemId, { stock: item.stock - units });

		let actions = {
			roleGiven: false,
			roleRemoved: false
		};

		if (roleManager) {
			if (item.roleToGive) {
				const role = roleManager.guild.roles.cache.get(item.roleToGive);
				if (role) {
					if (
						role.position >=
						roleManager.guild.members.cache.get(roleManager.client.user!.id)!
							.roles.highest.position
					) {
						return {
							success: false,
							message: 'roleToGive is above my highest role',
							code: 7
						};
					}

					await roleManager.add(role);
					actions.roleGiven = true;
				}
			}

			if (item.roleToRemove) {
				const role = roleManager.guild.roles.cache.get(item.roleToRemove);
				if (role) {
					if (
						role.position >=
						roleManager.guild.members.cache.get(roleManager.client.user!.id)!
							.roles.highest.position
					) {
						return {
							success: false,
							message: 'roleToRemove is above my highest role',
							code: 8
						};
					}

					await roleManager.remove(role);
					actions.roleRemoved = true;
				}
			}
		}

		return {
			success: true,
			message: 'Item added',
			code: 0,
			item,
			actions
		};
	}
}
