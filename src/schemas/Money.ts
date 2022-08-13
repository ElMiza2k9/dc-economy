import { Schema, model } from 'mongoose';

export class Money {
	userId: string = '';
	guildId: string = '';
	bank: number = 0;
	cash: number = 0;
}

export const MoneyModel = model('Money', new Schema(new Money()));
