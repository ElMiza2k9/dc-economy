import { Schema, model } from 'mongoose';

export class Shop {
	guildId: string = '';
	items: Array<Item> = [];
}

export interface Item {
	_id: string;
	name: string;
	price: number;
	description: string;
	type: 'common' | 'role';
	roleToGive?: string;
	roleToRemove?: string;
	roleRequired?: string;
	stock?: number;
	unlimited?: boolean;
	unique?: boolean;
}

export const ShopModel = model('Shop', new Schema(new Shop()));
