import type { Item } from './Shop';
import { Schema, model } from 'mongoose';

export class Inventory {
	userId: string = '';
	guildId: string = '';
	items: Array<Item> = [];
}

export const InventoryModel = model('Inventory', new Schema(new Inventory()));
