const { pool } = require('../config/database');

const sanitizeDateTime = (val) => {
    if (!val) return null;
    if (typeof val === 'string') {
        return val.replace('T', ' ').replace(/\.\d{3}Z$|Z$/, '').trim();
    }
    return val;
};


/*
|--------------------------------------------------------------------------
| GET ALL MEETINGS
|--------------------------------------------------------------------------
*/

exports.getMeetings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 15,
            search = '',
            status = '',
            meeting_status = '',
            related_to_type = '',
            tab = '',
            meeting_type = '',
            customer_type = '',
            owner_id = '',
            assigned_to = '',
            customer_id = '',
            scope = 'me',
            date_field = 'from_date',
            start_date = '',
            end_date = '',
            sort_by = '',
            order = 'desc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 15));
        const offset = (pageNum - 1) * limitNum;

        const parseMulti = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.flatMap(v => String(v).split(',')).map(s => s.trim()).filter(Boolean);
            return String(val).split(',').map(s => s.trim()).filter(Boolean);
        };

        const baseConditions = [];
        const baseParams = [];

        // Access control:
        // - Non-admin users: can ONLY see their own meetings (owner, creator, or participant)
        // - Admin users:
        //    * Default (scope !== 'all'): see only their own meetings ("for me only")
        //    * scope === 'all': see all meetings across all users (can optionally filter by owner_id)
        const isAdmin = req.user && req.user.role_name === 'admin';
        const isMeOnly = !isAdmin || scope === 'me';

        if (isMeOnly) {
            baseConditions.push(`(
                m.meeting_owner_id = ?
                OR m.created_by = ?
                OR EXISTS (
                    SELECT 1 FROM meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.participant_type = 'User'
                    AND mp.participant_id = ?
                )
            )`);
            baseParams.push(req.user.id, req.user.id, req.user.id);
        } else {
            const rawOwners = owner_id || assigned_to;
            if (rawOwners) {
                const ownerIds = parseMulti(rawOwners);
                if (ownerIds.length === 1) {
                    baseConditions.push('m.meeting_owner_id = ?');
                    baseParams.push(ownerIds[0]);
                } else if (ownerIds.length > 1) {
                    baseConditions.push(`m.meeting_owner_id IN (${ownerIds.map(() => '?').join(',')})`);
                    baseParams.push(...ownerIds);
                }
            }
        }

        const baseWhereSql = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';

        // Tab counts based on user permissions
        const [countsResult] = await pool.query(`
            SELECT
                COUNT(*) AS count_all,
                SUM(CASE WHEN m.related_to_type = 'Lead' THEN 1 ELSE 0 END) AS count_lead,
                SUM(CASE WHEN m.related_to_type IS NULL OR m.related_to_type != 'Lead' THEN 1 ELSE 0 END) AS count_normal
            FROM meetings m
            ${baseWhereSql}
        `, baseParams);

        const tabCounts = {
            all: Number(countsResult[0]?.count_all || 0),
            lead: Number(countsResult[0]?.count_lead || 0),
            normal: Number(countsResult[0]?.count_normal || 0),
        };

        const whereConditions = [...baseConditions];
        const params = [...baseParams];

        if (tab === 'lead') {
            whereConditions.push("m.related_to_type = 'Lead'");
        } else if (tab === 'normal') {
            whereConditions.push("(m.related_to_type IS NULL OR m.related_to_type != 'Lead')");
        } else if (related_to_type) {
            const relTypes = parseMulti(related_to_type);
            if (relTypes.length === 1) {
                if (relTypes[0] === 'Normal') {
                    whereConditions.push("(m.related_to_type IS NULL OR m.related_to_type != 'Lead')");
                } else {
                    whereConditions.push('m.related_to_type = ?');
                    params.push(relTypes[0]);
                }
            } else if (relTypes.length > 1) {
                const hasNormal = relTypes.includes('Normal');
                const otherTypes = relTypes.filter(t => t !== 'Normal');
                if (hasNormal && otherTypes.length > 0) {
                    whereConditions.push(`(m.related_to_type IS NULL OR m.related_to_type != 'Lead' OR m.related_to_type IN (${otherTypes.map(() => '?').join(',')}))`);
                    params.push(...otherTypes);
                } else if (hasNormal) {
                    whereConditions.push("(m.related_to_type IS NULL OR m.related_to_type != 'Lead')");
                } else {
                    whereConditions.push(`m.related_to_type IN (${otherTypes.map(() => '?').join(',')})`);
                    params.push(...otherTypes);
                }
            }
        }

        const rawStatus = status || meeting_status;
        if (rawStatus) {
            const statuses = parseMulti(rawStatus);
            if (statuses.length === 1) {
                whereConditions.push('m.meeting_status = ?');
                params.push(statuses[0]);
            } else if (statuses.length > 1) {
                whereConditions.push(`m.meeting_status IN (${statuses.map(() => '?').join(',')})`);
                params.push(...statuses);
            }
        }

        if (meeting_type) {
            const mTypes = parseMulti(meeting_type);
            if (mTypes.length === 1) {
                whereConditions.push('m.meeting_type = ?');
                params.push(mTypes[0]);
            } else if (mTypes.length > 1) {
                whereConditions.push(`m.meeting_type IN (${mTypes.map(() => '?').join(',')})`);
                params.push(...mTypes);
            }
        }

        if (customer_type) {
            const cTypes = parseMulti(customer_type);
            if (cTypes.length === 1) {
                whereConditions.push('m.customer_type = ?');
                params.push(cTypes[0]);
            } else if (cTypes.length > 1) {
                whereConditions.push(`m.customer_type IN (${cTypes.map(() => '?').join(',')})`);
                params.push(...cTypes);
            }
        }

        if (customer_id) {
            const custIds = parseMulti(customer_id);
            if (custIds.length === 1) {
                whereConditions.push("((m.related_to_type = 'Customer' AND m.related_to_id = ?) OR (m.related_to_type = 'Lead' AND l.customer_id = ?))");
                params.push(custIds[0], custIds[0]);
            } else if (custIds.length > 1) {
                const inPlaceholders = custIds.map(() => '?').join(',');
                whereConditions.push(`((m.related_to_type = 'Customer' AND m.related_to_id IN (${inPlaceholders})) OR (m.related_to_type = 'Lead' AND l.customer_id IN (${inPlaceholders})))`);
                params.push(...custIds, ...custIds);
            }
        }

        // Date range filters
        const validDateFields = {
            from_date: 'm.from_date',
            to_date: 'm.to_date',
            created_at: 'm.created_at',
            updated_at: 'm.updated_at'
        };
        const activeDateField = validDateFields[date_field] || 'm.from_date';

        if (start_date) {
            whereConditions.push(`${activeDateField} >= ?`);
            params.push(start_date.includes(' ') || start_date.includes('T') ? start_date : `${start_date} 00:00:00`);
        }
        if (end_date) {
            whereConditions.push(`${activeDateField} <= ?`);
            params.push(end_date.includes(' ') || end_date.includes('T') ? end_date : `${end_date} 23:59:59`);
        }

        if (search && search.trim()) {
            const terms = search.split(',').map(s => s.trim()).filter(Boolean);
            if (terms.length > 0) {
                const termClauses = [];
                for (const term of terms) {
                    const q = `%${term}%`;
                    termClauses.push(`(
                        m.meeting_subject LIKE ?
                        OR u.name LIKE ?
                        OR c.contact_name LIKE ?
                        OR cu.company_name LIKE ?
                        OR l.title LIKE ?
                        OR p.name LIKE ?
                        OR m.location LIKE ?
                        OR m.meeting_venue LIKE ?
                        OR m.description LIKE ?
                    )`);
                    params.push(q, q, q, q, q, q, q, q, q);
                }
                whereConditions.push(`(${termClauses.join(' OR ')})`);
            }
        }

        const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count total matching records
        const [countResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM meetings m
            LEFT JOIN users u ON m.meeting_owner_id = u.id
            LEFT JOIN contacts c ON m.meeting_to_type = 'Contact' AND m.meeting_to_id = c.id
            LEFT JOIN customers cu ON m.related_to_type = 'Customer' AND m.related_to_id = cu.id
            LEFT JOIN leads l ON m.related_to_type = 'Lead' AND m.related_to_id = l.id
            LEFT JOIN products p ON m.related_to_type = 'Product' AND m.related_to_id = p.id
            ${whereSql}
        `, params);

        const total = countResult[0]?.total || 0;

        // Fetch paginated records
        const sortColumnMap = {
            meeting_subject: 'm.meeting_subject',
            subject: 'm.meeting_subject',
            meeting_status: 'm.meeting_status',
            status: 'm.meeting_status',
            from_date: 'm.from_date',
            to_date: 'm.to_date',
            meeting_owner: 'u.name',
            owner: 'u.name',
            customer_type: 'm.customer_type',
            created_at: 'm.created_at',
            created_time: 'm.created_at',
            meeting_type: 'm.meeting_type',
            type: 'm.meeting_type',
            related_to: 'related_name',
            related_name: 'related_name',
            contact: 'c.contact_name',
            meeting_to_name: 'c.contact_name',
            description: 'm.description',
        };

        const sortDirection = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        let orderClause = 'ORDER BY m.from_date DESC';
        if (sort_by && sortColumnMap[sort_by]) {
            orderClause = `ORDER BY ${sortColumnMap[sort_by]} ${sortDirection}, m.from_date DESC`;
        }

        const [rows] = await pool.query(`
            SELECT
                m.id,
                m.meeting_subject,
                m.from_date,
                m.to_date,
                m.meeting_status,
                m.customer_type,
                m.meeting_type,
                m.location,
                m.meeting_venue,
                m.participants_reminder,
                m.all_day,
                m.meeting_owner_id,
                m.meeting_to_type,
                m.meeting_to_id,
                m.related_to_type,
                m.related_to_id,
                m.description,
                m.created_by,
                m.modified_by,
                m.created_at,
                m.updated_at,
                u.name AS meeting_owner_name,
                c.contact_name AS meeting_to_name,
                CASE
                    WHEN m.related_to_type = 'Customer' THEN cu.company_name
                    WHEN m.related_to_type = 'Lead' THEN l.title
                    WHEN m.related_to_type = 'Product' THEN p.name
                    ELSE NULL
                END AS related_name
            FROM meetings m
            LEFT JOIN users u ON m.meeting_owner_id = u.id
            LEFT JOIN contacts c ON m.meeting_to_type = 'Contact' AND m.meeting_to_id = c.id
            LEFT JOIN customers cu ON m.related_to_type = 'Customer' AND m.related_to_id = cu.id
            LEFT JOIN leads l ON m.related_to_type = 'Lead' AND m.related_to_id = l.id
            LEFT JOIN products p ON m.related_to_type = 'Product' AND m.related_to_id = p.id
            ${whereSql}
            ${orderClause}
            LIMIT ? OFFSET ?
        `, [...params, limitNum, offset]);

        res.json({
            success: true,
            data: rows,
            counts: tabCounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load meetings'
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET MEETING BY ID
|--------------------------------------------------------------------------
*/

exports.getMeetingById = async (req, res) => {
    try {

        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                m.id,
                m.meeting_subject,
                m.from_date,
                m.to_date,
                m.meeting_status,
                m.customer_type,
                m.meeting_type,
                m.location,
                m.meeting_venue,
                m.participants_reminder,
                m.reminder,
                m.all_day,
                m.meeting_owner_id,
                m.meeting_to_type,
                m.meeting_to_id,
                m.related_to_type,
                m.related_to_id,
                m.description,
                m.created_by,
                m.modified_by,
                m.created_at,
                m.updated_at,

                u.name AS meeting_owner_name,

                c.contact_name AS meeting_to_name,

                CASE
                    WHEN m.related_to_type = 'Customer'
                        THEN cu.company_name

                    WHEN m.related_to_type = 'Lead'
                        THEN l.title

                    WHEN m.related_to_type = 'Product'
                        THEN p.name

                    ELSE NULL
                END AS related_name

            FROM meetings m

            LEFT JOIN users u
                ON m.meeting_owner_id = u.id

            LEFT JOIN contacts c
                ON m.meeting_to_type = 'Contact'
                AND m.meeting_to_id = c.id

            LEFT JOIN customers cu
                ON m.related_to_type = 'Customer'
                AND m.related_to_id = cu.id

            LEFT JOIN leads l
                ON m.related_to_type = 'Lead'
                AND m.related_to_id = l.id

            LEFT JOIN products p
                ON m.related_to_type = 'Product'
                AND m.related_to_id = p.id

            WHERE m.id = ?

            LIMIT 1
        `, [id]);

        if (!rows.length) {

            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }


        const [participants] = await pool.query(`
            SELECT
                mp.id,
                mp.participant_type,
                mp.participant_id,

                CASE
                    WHEN mp.participant_type = 'Contact'
                        THEN c.contact_name

                    WHEN mp.participant_type = 'User'
                        THEN u.name

                    ELSE NULL
                END AS participant_name,

                CASE
                    WHEN mp.participant_type = 'Contact'
                        THEN c.email

                    WHEN mp.participant_type = 'User'
                        THEN u.email

                    ELSE NULL
                END AS participant_email

            FROM meeting_participants mp

            LEFT JOIN contacts c
                ON mp.participant_type = 'Contact'
                AND mp.participant_id = c.id

            LEFT JOIN users u
                ON mp.participant_type = 'User'
                AND mp.participant_id = u.id

            WHERE mp.meeting_id = ?

            ORDER BY mp.created_at ASC
        `, [id]);

        // Access control: non-admin can only access if owner, creator, or participant
        if (req.user && req.user.role_name !== 'admin') {
            const isOwner = rows[0].meeting_owner_id === req.user.id;
            const isCreator = rows[0].created_by === req.user.id;
            const isParticipant = participants.some(
                p => p.participant_type === 'User' && p.participant_id === req.user.id
            );
            if (!isOwner && !isCreator && !isParticipant) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only view your own meetings'
                });
            }
        }

        res.json({
            success: true,
            data: {
                ...rows[0],
                participants
            }
        });

    } catch (error) {

        console.error('Get meeting error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load meeting'
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET RELATED RECORDS
|--------------------------------------------------------------------------
*/

exports.getRelatedRecords = async (req, res) => {
    try {

        const { type } = req.params;

        let query = '';

        switch (type.toLowerCase()) {

            case 'customer':

                query = `
                    SELECT
                        id,
                        company_name AS name
                    FROM customers
                    WHERE is_active = 1
                    ORDER BY company_name ASC
                `;

                break;


            case 'lead':

                query = `
                    SELECT
                        id,
                        title AS name
                    FROM leads
                    ORDER BY title ASC
                `;

                break;


            case 'product':

                query = `
                    SELECT
                        id,
                        name
                    FROM products
                    WHERE is_active = 1
                    ORDER BY name ASC
                `;

                break;


            case 'campaign':

                query = `
                    SELECT
                        id,
                        name
                    FROM campaigns
                    WHERE is_active = 1
                    ORDER BY name ASC
                `;

                break;


            case 'quote':

                query = `
                    SELECT
                        id,
                        quote_number AS name
                    FROM quotes
                    ORDER BY quote_number ASC
                `;

                break;


            case 'sales-order':

                query = `
                    SELECT
                        id,
                        order_number AS name
                    FROM sales_orders
                    ORDER BY order_number ASC
                `;

                break;


            case 'invoice':

                query = `
                    SELECT
                        id,
                        invoice_number AS name
                    FROM invoices
                    ORDER BY invoice_number ASC
                `;

                break;


            case 'contract':

                query = `
                    SELECT
                        id,
                        contract_number AS name
                    FROM contracts
                    ORDER BY contract_number ASC
                `;

                break;


            default:

                return res.status(400).json({
                    success: false,
                    message: `Unsupported related type: ${type}`
                });
        }


        const [rows] = await pool.query(query);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error('Meeting related records error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load related records'
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET PARTICIPANTS
|--------------------------------------------------------------------------
*/

exports.getParticipants = async (req, res) => {
    try {

        const type = req.query.type || 'Contacts';

        const search = req.query.search || '';

        let rows = [];


        if (type === 'Contacts') {

            const [contacts] = await pool.query(`
                SELECT
                    id,
                    contact_name AS name,
                    email
                FROM contacts
                WHERE
                    contact_name LIKE ?
                    OR email LIKE ?
                ORDER BY contact_name ASC
                LIMIT 100
            `, [
                `%${search}%`,
                `%${search}%`
            ]);

            rows = contacts;

        } else if (type === 'Users') {

            const [users] = await pool.query(`
                SELECT
                    id,
                    name,
                    email
                FROM users
                WHERE
                    is_active = 1
                    AND (
                        name LIKE ?
                        OR email LIKE ?
                    )
                ORDER BY name ASC
                LIMIT 100
            `, [
                `%${search}%`,
                `%${search}%`
            ]);

            rows = users;

        } else if (type === 'Groups') {

            /*
             * Add your actual groups table here
             * when the Groups table is available.
             */

            rows = [];

        } else if (type === 'Databases') {

            rows = [];

        } else {

            return res.status(400).json({
                success: false,
                message: 'Invalid participant type'
            });
        }


        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error('Get participants error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load participants'
        });
    }
};


/*
|--------------------------------------------------------------------------
| CREATE MEETING
|--------------------------------------------------------------------------
*/

exports.createMeeting = async (req, res) => {

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const {
            meeting_subject,
            from_date,
            to_date,
            meeting_status,
            customer_type,
            meeting_type,
            location,
            meeting_venue,
            participants_reminder,
            reminder,
            all_day,
            meeting_to_type,
            meeting_to_id,
            related_to_type,
            related_to_id,
            description,
            participants = []
        } = req.body;


        if (!meeting_subject || !meeting_subject.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Meeting subject is required'
            });
        }


        if (!from_date || !to_date) {

            return res.status(400).json({
                success: false,
                message: 'From date and To date are required'
            });
        }


        const ownerId = req.user.id;
        const cleanFromDate = sanitizeDateTime(from_date);
        const cleanToDate = sanitizeDateTime(to_date);

        const [result] = await connection.query(`
            INSERT INTO meetings
            (
                meeting_subject,
                from_date,
                to_date,
                meeting_status,
                customer_type,
                meeting_type,
                location,
                meeting_venue,
                participants_reminder,
                reminder,
                all_day,
                meeting_owner_id,
                meeting_to_type,
                meeting_to_id,
                related_to_type,
                related_to_id,
                description,
                created_by,
                modified_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            meeting_subject.trim(),
            cleanFromDate,
            cleanToDate,
            meeting_status || 'Not Started',
            customer_type || 'New',
            meeting_type || 'In Person',
            location || null,
            meeting_venue || null,
            participants_reminder || 'None',
            reminder || 'None',
            all_day ? 1 : 0,
            ownerId,
            meeting_to_type || null,
            meeting_to_id || null,
            related_to_type || null,
            related_to_id || null,
            description?.trim() || null,
            ownerId,
            ownerId
        ]);


        const meetingId = result.insertId;


        /*
        |--------------------------------------------------------------------------
        | PARTICIPANTS
        |--------------------------------------------------------------------------
        */

        if (Array.isArray(participants) && participants.length) {

            for (const participant of participants) {

                if (
                    !participant.participant_type ||
                    !participant.participant_id
                ) {
                    continue;
                }

                await connection.query(`
                    INSERT IGNORE INTO meeting_participants
                    (
                        meeting_id,
                        participant_type,
                        participant_id
                    )
                    VALUES (?, ?, ?)
                `, [
                    meetingId,
                    participant.participant_type,
                    participant.participant_id
                ]);
            }
        }


        await connection.commit();


        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            id: meetingId
        });

    } catch (error) {

        await connection.rollback();

        console.error('Create meeting error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create meeting'
        });

    } finally {

        connection.release();

    }
};


/*
|--------------------------------------------------------------------------
| UPDATE MEETING
|--------------------------------------------------------------------------
*/

exports.updateMeeting = async (req, res) => {

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        const { id } = req.params;

        // Access control: non-admin can only edit their own meetings
        if (req.user && req.user.role_name !== 'admin') {
            const [check] = await connection.query(
                'SELECT meeting_owner_id, created_by FROM meetings WHERE id = ?',
                [id]
            );
            if (!check.length) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Meeting not found' });
            }
            if (check[0].meeting_owner_id !== req.user.id && check[0].created_by !== req.user.id) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only edit your own meetings'
                });
            }
        }

        const {
            meeting_subject,
            from_date,
            to_date,
            meeting_status,
            customer_type,
            meeting_type,
            location,
            meeting_venue,
            participants_reminder,
            reminder,
            all_day,
            meeting_to_type,
            meeting_to_id,
            related_to_type,
            related_to_id,
            description,
            participants = []
        } = req.body;


        if (!meeting_subject || !meeting_subject.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Meeting subject is required'
            });
        }


        const modifiedBy = req.user.id;


        const cleanFromDate = sanitizeDateTime(from_date);
        const cleanToDate = sanitizeDateTime(to_date);

        const [result] = await connection.query(`
            UPDATE meetings
            SET
                meeting_subject = ?,
                from_date = ?,
                to_date = ?,
                meeting_status = ?,
                customer_type = ?,
                meeting_type = ?,
                location = ?,
                meeting_venue = ?,
                participants_reminder = ?,
                reminder = ?,
                all_day = ?,
                meeting_to_type = ?,
                meeting_to_id = ?,
                related_to_type = ?,
                related_to_id = ?,
                description = ?,
                modified_by = ?
            WHERE id = ?
        `, [
            meeting_subject.trim(),
            cleanFromDate,
            cleanToDate,
            meeting_status || 'Not Started',
            customer_type || 'New',
            meeting_type || 'In Person',
            location || null,
            meeting_venue || null,
            participants_reminder || 'None',
            reminder || 'None',
            all_day ? 1 : 0,
            meeting_to_type || null,
            meeting_to_id || null,
            related_to_type || null,
            related_to_id || null,
            description?.trim() || null,
            modifiedBy,
            id
        ]);


        if (!result.affectedRows) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }


        /*
        |--------------------------------------------------------------------------
        | REPLACE PARTICIPANTS
        |--------------------------------------------------------------------------
        */

        await connection.query(`
            DELETE FROM meeting_participants
            WHERE meeting_id = ?
        `, [id]);


        if (Array.isArray(participants) && participants.length) {

            for (const participant of participants) {

                if (
                    !participant.participant_type ||
                    !participant.participant_id
                ) {
                    continue;
                }

                await connection.query(`
                    INSERT IGNORE INTO meeting_participants
                    (
                        meeting_id,
                        participant_type,
                        participant_id
                    )
                    VALUES (?, ?, ?)
                `, [
                    id,
                    participant.participant_type,
                    participant.participant_id
                ]);
            }
        }


        await connection.commit();


        res.json({
            success: true,
            message: 'Meeting updated successfully'
        });

    } catch (error) {

        await connection.rollback();

        console.error('Update meeting error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update meeting'
        });

    } finally {

        connection.release();

    }
};


/*
|--------------------------------------------------------------------------
| DELETE MEETING
|--------------------------------------------------------------------------
*/

exports.deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;

        // Access control: non-admin can only delete their own meetings
        if (req.user && req.user.role_name !== 'admin') {
            const [check] = await pool.query(
                'SELECT meeting_owner_id, created_by FROM meetings WHERE id = ?',
                [id]
            );
            if (!check.length) {
                return res.status(404).json({ success: false, message: 'Meeting not found' });
            }
            if (check[0].meeting_owner_id !== req.user.id && check[0].created_by !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only delete your own meetings'
                });
            }
        }

        const [result] = await pool.query(`
            DELETE FROM meetings
            WHERE id = ?
        `, [id]);


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }


        res.json({
            success: true,
            message: 'Meeting deleted successfully'
        });

    } catch (error) {

        console.error('Delete meeting error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete meeting'
        });
    }
};


/*
|--------------------------------------------------------------------------
| CLONE MEETING
|--------------------------------------------------------------------------
*/
exports.cloneMeeting = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // 1. Fetch original meeting
        const [rows] = await connection.query(
            'SELECT * FROM meetings WHERE id = ? LIMIT 1',
            [id]
        );

        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        const m = rows[0];

        // 2. Access control: non-admin can only clone meetings they have access to
        if (req.user && req.user.role_name !== 'admin') {
            const [partCheck] = await connection.query(
                `SELECT 1 FROM meeting_participants WHERE meeting_id = ? AND participant_type = 'User' AND participant_id = ?`,
                [id, req.user.id]
            );
            const isOwner = m.meeting_owner_id === req.user.id;
            const isCreator = m.created_by === req.user.id;
            const isParticipant = partCheck.length > 0;
            if (!isOwner && !isCreator && !isParticipant) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only clone your own meetings'
                });
            }
        }

        // 3. New subject with _copy at the end
        const newSubject = `${m.meeting_subject || 'Meeting'}_copy`;

        // 4. Insert cloned meeting
        const [result] = await connection.query(`
            INSERT INTO meetings (
                meeting_subject,
                from_date,
                to_date,
                meeting_status,
                customer_type,
                meeting_type,
                location,
                meeting_venue,
                participants_reminder,
                reminder,
                all_day,
                meeting_owner_id,
                meeting_to_type,
                meeting_to_id,
                related_to_type,
                related_to_id,
                description,
                created_by,
                modified_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newSubject,
            sanitizeDateTime(m.from_date),
            sanitizeDateTime(m.to_date),
            m.meeting_status || 'Not Started',
            m.customer_type || 'New',
            m.meeting_type || 'In Person',
            m.location || null,
            m.meeting_venue || null,
            m.participants_reminder || 'None',
            m.reminder || 'None',
            m.all_day ? 1 : 0,
            m.meeting_owner_id || req.user.id,
            m.meeting_to_type || null,
            m.meeting_to_id || null,
            m.related_to_type || null,
            m.related_to_id || null,
            m.description || null,
            req.user.id,
            req.user.id
        ]);

        const newMeetingId = result.insertId;

        // 5. Clone participants
        const [participants] = await connection.query(
            'SELECT participant_type, participant_id FROM meeting_participants WHERE meeting_id = ?',
            [id]
        );

        if (participants.length > 0) {
            const participantValues = participants.map(p => [
                newMeetingId,
                p.participant_type,
                p.participant_id
            ]);
            await connection.query(
                'INSERT INTO meeting_participants (meeting_id, participant_type, participant_id) VALUES ?',
                [participantValues]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Meeting cloned successfully',
            data: {
                id: newMeetingId,
                meeting_subject: newSubject
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Clone meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone meeting'
        });
    } finally {
        connection.release();
    }
};