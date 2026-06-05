import { fail } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase-client';

export const load = async () => {
	const url = process.env.SUPABASE_URL ?? '(not set)';
	const anonKey = process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.slice(0, 8)}…${process.env.SUPABASE_ANON_KEY.slice(-8)}` : '(not set)';

	if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
		return {
			url,
			anonKey,
			error: 'Supabase credentials not configured. Cannot inspect schema.',
			columns: [] as Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>,
			rlsEnabled: false,
			rlsPolicies: [] as Array<{ policy_name: string; cmd: string; role: string; definition: string | null }>,
			rowCount: null as number | null,
			sampleRows: null as unknown[] | null,
		};
	}

	const supabase = getSupabaseClient();

	// Fetch column info from information_schema
	const { data: columns, error: columnsError } = await supabase
		.from('information_schema.columns')
		.select('column_name, data_type, is_nullable, column_default')
		.eq('table_schema', 'public')
		.eq('table_name', 'posts')
		.order('ordinal_position');

	if (columnsError) {
		return {
			url,
			anonKey,
			error: `Failed to fetch schema: ${columnsError.message}`,
			columns: [] as Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>,
			rlsEnabled: false,
			rlsPolicies: [] as Array<{ policy_name: string; cmd: string; role: string; definition: string | null }>,
			rowCount: null as number | null,
			sampleRows: null as unknown[] | null,
		};
	}

	// Check if RLS is enabled on the posts table
	const { data: rlsData } = await supabase.rpc('pg_show_publication_tables');

	// Alternative: check pg_tables for row_level_security
	const { data: rlsCheck } = await supabase.rpc('pg_relation_size', {
		relid: 'posts'
	});

	// Use a direct query for RLS status
	const { data: rlsRows } = await supabase
		.from('pg_tables')
		.select('tablename, rowsecurity')
		.eq('tablename', 'posts');

	const rlsEnabled = rlsRows?.[0]?.rowsecurity === true;

	// Fetch RLS policies if available
	let rlsPolicies: Array<{ policy_name: string; cmd: string; role: string; definition: string | null }> = [];
	if (rlsEnabled) {
		const { data: policies } = await supabase.rpc('pg_policies', {
			tableoid: undefined as unknown
		});
		// pg_policies might not exist as a function in all versions; try system catalog instead
		const { data: polRows } = await supabase
			.from('pg_policies')
			.select('*')
			.eq('tablename', 'posts');
		if (polRows && polRows.length > 0) {
			rlsPolicies = polRows.map((p: any) => ({
				policy_name: p.policyname,
				cmd: p.cmd,
				role: p.roles?.[0] ?? 'all',
				definition: p.definition,
			}));
		}
	}

	// Fetch row count
	const { count: rowCount, error: countError } = await supabase
		.from('posts')
		.select('*', { count: 'exact', head: true });

	// Fetch a few sample rows
	const { data: sampleRows, error: sampleError } = await supabase
		.from('posts')
		.select('*')
		.limit(5);

	return {
		url,
		anonKey,
		error: null,
		columns: columns?.map((c: any) => ({
			column_name: c.column_name,
			data_type: c.data_type,
			is_nullable: c.is_nullable,
			column_default: c.column_default,
		})) ?? [],
		rlsEnabled: rlsEnabled ?? false,
		rlsPolicies,
		rowCount: rowCount ?? null,
		sampleRows: sampleRows ?? null,
	};
};
