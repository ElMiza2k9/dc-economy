import { InventoryModel, ShopModel } from '../schemas';
import type { Inventory as InvClass } from '../schemas/Inventory';
import type { Item } from '../schemas/Shop';
import type { Document } from 'mongoose';

export class Inventory {
	public async getInventory(
		userId: string,
		guildId: string,
		raw: false
	): Promise<Item[]>;
	// @ts-expect-error
	public async getInventory(
		userId: string,
		guildId: string,
		raw: true
	): Promise<MongooseDocument>;
	public async getInventory(userId: string, guildId: string, raw = false) {
		let inv = await InventoryModel.findOne({ userId, guildId });
		if (!inv) inv = await InventoryModel.create({ userId, guildId });

		if (raw) return inv;
		else {
			return inv.items;
		}
	}

	public async addItem(userId: string, guildId: string, itemId: string) {
		const shop = await ShopModel.findOne({ guildId });
		if (!shop)
			return {
				success: false,
				message: 'Shop not found',
				code: 1
			};

		const item = shop.items.find(i => i._id === itemId);
		if (!item)
			return {
				success: false,
				message: 'Item not found',
				code: 2
			};

		const inv = await this.getInventory(userId, guildId, true);

		const existingItem = inv.items.some(i => i._id === itemId);
		if (existingItem && item.unique)
			return {
				success: false,
				message: 'You can only have one of this item',
				code: 3
			};

		inv.items.push(item);
		await inv.save();

		return {
			success: true,
			message: 'Item added',
			code: 0
		};
	}

	public async removeItem(
		userId: string,
		guildId: string,
		itemId: string,
		units?: number | 'all'
	) {
		const inv = await this.getInventory(userId, guildId, true);

		const items = inv.items.filter(i => i._id === itemId);
		if (!items[0])
			return {
				success: false,
				message: 'Item not found in inventory',
				code: 1
			};

		if (typeof units == 'number') {
			for (let i = 0; i < units; i++) {
				inv.items.splice(inv.items.indexOf(items[0]), 1);
			}
		} else if (units == 'all') {
			inv.items = inv.items.filter(i => i._id !== itemId);
		} else {
			inv.items.splice(inv.items.indexOf(items[0]), 1);
		}

		await inv.save();

		return {
			success: true,
			message: 'Item removed',
			code: 0
		};
	}

	public async reset(userId: string, guildId: string) {
		const inv = await this.getInventory(userId, guildId, true);
		inv.items = [];
		await inv.save();

		return {
			success: true,
			message: 'Inventory reset',
			code: 0
		};
	}
}

export type MongooseDocument = Document<unknown, any, InvClass> &
	InvClass & { _id: string };
