import { MoneyModel } from '../schemas';

export class Economy {
	public async balance(userId: string, guildId: string) {
		let model = await MoneyModel.findOne({ userId, guildId });
		if (!model) model = await MoneyModel.create({ userId, guildId });

		return model;
	}

	public async addMoney(
		userId: string,
		guildId: string,
		amount: number,
		target: 'bank' | 'cash' = 'cash'
	) {
		const doc = await this.balance(userId, guildId);

		doc[target] += amount;
		await doc.save();

		return {
			success: true,
			message: 'Money added',
			code: 0,
			[target]: doc[target]
		};
	}

	public async removeMoney(
		userId: string,
		guildId: string,
		amount: number | 'all',
		target: 'bank' | 'cash' = 'cash'
	) {
		const doc = await this.balance(userId, guildId);

		if (doc[target] < amount) {
			return {
				success: false,
				message: 'Not enough money in the source',
				code: 1
			};
		}

		if (amount == 'all') doc[target] = 0;
		else doc[target] -= amount;

		await doc.save();
		return {
			success: true,
			message: 'Money removed',
			code: 0,
			[target]: doc[target]
		};
	}

	public async deposit(userId: string, guildId: string, amount: number) {
		const doc = await this.balance(userId, guildId);

		if (doc.cash < amount) {
			return {
				success: false,
				message: 'Not enough money in the cash',
				code: 1
			};
		}

		doc.bank += amount;
		doc.cash -= amount;
		await doc.save();

		return {
			success: true,
			message: 'Money deposited',
			code: 0,
			balance: {
				bank: doc.bank,
				cash: doc.cash
			}
		};
	}

	public async withdraw(userId: string, guildId: string, amount: number) {
		const doc = await this.balance(userId, guildId);

		if (doc.bank < amount) {
			return {
				success: false,
				message: 'Not enough money in the bank',
				code: 1
			};
		}

		doc.bank -= amount;
		doc.cash += amount;
		await doc.save();

		return {
			success: true,
			message: 'Money withdrawn',
			code: 0,
			balance: {
				bank: doc.bank,
				cash: doc.cash
			}
		};
	}

	public async transfer(
		userId: string,
		userToTransfer: string,
		guildId: string,
		amount: number,
		from: 'bank' | 'cash' = 'cash'
	) {
		const doc = await this.balance(userId, guildId);
		const docToTransfer = await this.balance(userToTransfer, guildId);

		if (doc[from] < amount) {
			return {
				success: false,
				message: 'Not enough money in the source',
				code: 1
			};
		}
		doc[from] -= amount;
		docToTransfer[from] += amount;
		await doc.save();
		await docToTransfer.save();

		return {
			success: true,
			message: 'Money transferred',
			code: 0,
			from: doc,
			to: docToTransfer
		};
	}

	public async reset(
		userId: string,
		guildId: string,
		target: 'all' | 'bank' | 'cash'
	) {
		const doc = await this.balance(userId, guildId);

		if (target == 'all') {
			doc.bank = 0;
			doc.cash = 0;
		} else {
			doc[target] = 0;
		}
		await doc.save();

		return {
			success: true,
			message: 'Balance reset',
			code: 0
		};
	}

	public async work(
		userId: string,
		guildId: string,
		minAmount: number,
		maxAmount: number
	) {
		const randomAmount =
			~~(Math.random() * (maxAmount - minAmount + 1)) + minAmount;

		const promise = await this.addMoney(userId, guildId, randomAmount, 'cash');

		return {
			success: true,
			message: `Worked and earned ${randomAmount}`,
			code: 0,
			balance: promise['cash'] as number,
			earned: randomAmount
		};
	}
}
