import crypto from 'crypto';

export function createId(length: number = 8) {
	return crypto.randomBytes(length).toString('hex').slice(0, length);
}