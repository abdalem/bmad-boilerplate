import type { HttpContext } from '@adonisjs/core/http';
import { ServiceError } from '#services/errors';

export const handleHttpError = (ctx: HttpContext, error: unknown) => {
	if (error instanceof ServiceError) {
		return ctx.response.status(error.status).send({
			error: error.code,
			message: error.message,
			details: error.details,
		});
	}

	console.error(error);
	return ctx.response.status(500).send({
		error: 'INTERNAL_ERROR',
		message: 'Unexpected server error.',
	});
};
