import { runDoctor } from '../lib/doctor.js';

export const runDoctorCommand = async (targetPath?: string) => {
	const result = await runDoctor(targetPath);

	for (const check of result.checks) {
		const symbol = check.ok ? 'OK' : check.optional ? 'WARN' : 'FAIL';
		console.log(`[${symbol}] ${check.name} -> ${check.details}`);
	}

	if (!result.ok) {
		process.exitCode = 1;
	}
};
