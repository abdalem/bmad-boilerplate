export type ServiceErrorCode =
	| 'NOT_CONFIGURED'
	| 'NOT_FOUND'
	| 'BAD_REQUEST'
	| 'UPSTREAM_ERROR';

export class ServiceError extends Error {
	constructor(
		public readonly code: ServiceErrorCode,
		message: string,
		public readonly status: number,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = 'ServiceError';
	}
}
