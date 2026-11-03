const { pool } = require('../config/database');


// ============================================================
// GET ALL CALLS
// ============================================================

exports.getCalls = async (req, res) => {

    try {

        const {
            search = '',
            status = '',
            call_type = '',
            related_to_type = '',
            tab = '',
            owner_id = '',
            scope = 'me',
            page = 1,
            limit = 15
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 15));
        const offset = (pageNum - 1) * limitNum;

        let baseWhere = 'WHERE 1 = 1';
        const baseParams = [];

        // Access control:
        // - Non-admin users: can ONLY see their own calls
        // - Admin users:
        //    * Default (scope !== 'all'): see only their own calls ("for me only")
        //    * scope === 'all': see all calls across all users
        const isAdmin = req.user && req.user.role_name === 'admin';
        const isMeOnly = !isAdmin || scope === 'me';

        if (isMeOnly) {
            baseWhere += ` AND (c.call_owner_id = ? OR c.created_by = ?) `;
            baseParams.push(req.user.id, req.user.id);
        } else if (owner_id) {
            baseWhere += ` AND c.call_owner_id = ? `;
            baseParams.push(owner_id);
        }

        // Tab counts based on user permissions
        const [countsResult] = await pool.query(`
            SELECT
                COUNT(*) AS count_all,
                SUM(CASE WHEN c.related_to_type = 'Lead' THEN 1 ELSE 0 END) AS count_lead,
                SUM(CASE WHEN c.related_to_type IS NULL OR c.related_to_type != 'Lead' THEN 1 ELSE 0 END) AS count_normal
            FROM calls c
            ${baseWhere}
        `, baseParams);

        const tabCounts = {
            all: Number(countsResult[0]?.count_all || 0),
            lead: Number(countsResult[0]?.count_lead || 0),
            normal: Number(countsResult[0]?.count_normal || 0),
        };

        let where = baseWhere;
        const params = [...baseParams];

        if (tab === 'lead') {
            where += " AND c.related_to_type = 'Lead' ";
        } else if (tab === 'normal') {
            where += " AND (c.related_to_type IS NULL OR c.related_to_type != 'Lead') ";
        } else if (related_to_type) {
            where += ` AND c.related_to_type = ? `;
            params.push(related_to_type);
        }

        if (search.trim()) {

            where += `
                AND (
                    c.call_subject LIKE ?
                    OR u.name LIKE ?
                    OR con.contact_name LIKE ?
                )
            `;

            const searchValue =
                `%${search.trim()}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue
            );
        }

        if (status) {

            where += `
                AND c.call_status = ?
            `;

            params.push(status);
        }

        if (call_type) {

            where += `
                AND c.call_type = ?
            `;

            params.push(call_type);
        }

        const [rows] = await pool.query(
            `
            SELECT
                c.*,

                u.name AS call_owner_name,

                con.contact_name AS call_to_name,

                creator.name AS created_by_name,

                modifier.name AS modified_by_name,

                CASE
                    WHEN c.related_to_type = 'Customer'
                        THEN cu.company_name

                    WHEN c.related_to_type = 'Lead'
                        THEN l.title

                    WHEN c.related_to_type = 'Product'
                        THEN p.name

                    ELSE NULL
                END AS related_name

            FROM calls c

            LEFT JOIN users u
                ON c.call_owner_id = u.id

            LEFT JOIN contacts con
                ON c.call_to_type = 'Contact'
                AND c.call_to_id = con.id

            LEFT JOIN users creator
                ON c.created_by = creator.id

            LEFT JOIN users modifier
                ON c.modified_by = modifier.id

            LEFT JOIN customers cu
                ON c.related_to_type = 'Customer'
                AND c.related_to_id = cu.id

            LEFT JOIN leads l
                ON c.related_to_type = 'Lead'
                AND c.related_to_id = l.id

            LEFT JOIN products p
                ON c.related_to_type = 'Product'
                AND c.related_to_id = p.id

            ${where}

            ORDER BY
                c.start_time DESC

            LIMIT ? OFFSET ?
            `,
            [
                ...params,
                limitNum,
                offset
            ]
        );

        const [countRows] = await pool.query(
            `
            SELECT
                COUNT(*) AS total

            FROM calls c

            LEFT JOIN users u
                ON c.call_owner_id = u.id

            LEFT JOIN contacts con
                ON c.call_to_type = 'Contact'
                AND c.call_to_id = con.id

            ${where}
            `,
            params
        );

        const total = countRows[0]?.total || 0;

        res.json({
            success: true,
            data: rows,
            counts: tabCounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: total,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {

        console.error(
            'Get calls error:',
            error
        );

        res.status(500).json({

            success: false,

            message:
                'Failed to fetch calls'

        });

    }
};


// ============================================================
// GET CALL BY ID
// ============================================================

exports.getCallById = async (req, res) => {
    try {

        const { id } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                c.*,

                u.name AS call_owner_name,

                con.contact_name AS call_to_name,

                creator.name AS created_by_name,

                modifier.name AS modified_by_name,

                CASE
                    WHEN c.related_to_type = 'Customer'
                        THEN cu.company_name

                    WHEN c.related_to_type = 'Lead'
                        THEN l.title

                    WHEN c.related_to_type = 'Product'
                        THEN p.name

                    ELSE NULL
                END AS related_name

            FROM calls c

            LEFT JOIN users u
                ON c.call_owner_id = u.id

            LEFT JOIN contacts con
                ON c.call_to_type = 'Contact'
                AND c.call_to_id = con.id

            LEFT JOIN users creator
                ON c.created_by = creator.id

            LEFT JOIN users modifier
                ON c.modified_by = modifier.id

            LEFT JOIN customers cu
                ON c.related_to_type = 'Customer'
                AND c.related_to_id = cu.id

            LEFT JOIN leads l
                ON c.related_to_type = 'Lead'
                AND c.related_to_id = l.id

            LEFT JOIN products p
                ON c.related_to_type = 'Product'
                AND c.related_to_id = p.id

            WHERE c.id = ?
            `,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Call not found'
            });
        }

        const call = rows[0];

        res.json({
            success: true,
            data: call
        });

    } catch (error) {

        console.error(
            'Get call error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch call'
        });
    }
};


// ============================================================
// CREATE CALL
// ============================================================

exports.createCall = async (req, res) => {

    try {

        const {
            call_subject,
            call_type,
            call_status,
            start_time,
            duration_minutes,
            duration_seconds,
            call_purpose,
            call_result,
            reminder,
            call_to_type,
            call_to_id,
            related_to_type,
            related_to_id,
            description
        } = req.body;


        if (
            !call_subject ||
            !call_subject.trim()
        ) {

            return res.status(400).json({
                success: false,
                message: 'Call subject is required'
            });
        }


        if (!start_time) {

            return res.status(400).json({
                success: false,
                message: 'Start time is required'
            });
        }


        // NEVER trust owner from frontend
        const ownerId = req.user.id;


        const [result] = await pool.query(
            `
            INSERT INTO calls
            (
                call_subject,
                call_type,
                call_status,
                start_time,
                duration_minutes,
                duration_seconds,
                call_purpose,
                call_result,
                reminder,
                call_owner_id,
                call_to_type,
                call_to_id,
                related_to_type,
                related_to_id,
                description,
                created_by,
                modified_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                call_subject.trim(),

                call_type ||
                    'Outbound',

                call_status ||
                    'Scheduled',

                start_time,

                Number(
                    duration_minutes || 0
                ),

                Number(
                    duration_seconds || 0
                ),

                call_purpose ||
                    null,

                call_result ||
                    null,

                reminder ||
                    'None',

                ownerId,

                call_to_type ||
                    null,

                call_to_id ||
                    null,

                related_to_type ||
                    null,

                related_to_id ||
                    null,

                description?.trim() ||
                    null,

                ownerId,

                ownerId
            ]
        );


        res.status(201).json({

            success: true,

            message:
                'Call created successfully',

            id: result.insertId

        });

    } catch (error) {

        console.error(
            'Create call error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to create call'
        });
    }
};


// ============================================================
// UPDATE CALL
// ============================================================

exports.updateCall = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            call_subject,
            call_type,
            call_status,
            start_time,
            duration_minutes,
            duration_seconds,
            call_purpose,
            call_result,
            reminder,
            call_to_type,
            call_to_id,
            related_to_type,
            related_to_id,
            description
        } = req.body;


        if (
            !call_subject ||
            !call_subject.trim()
        ) {

            return res.status(400).json({
                success: false,
                message: 'Call subject is required'
            });
        }


        const [result] = await pool.query(
            `
            UPDATE calls

            SET
                call_subject = ?,
                call_type = ?,
                call_status = ?,
                start_time = ?,
                duration_minutes = ?,
                duration_seconds = ?,
                call_purpose = ?,
                call_result = ?,
                reminder = ?,
                call_to_type = ?,
                call_to_id = ?,
                related_to_type = ?,
                related_to_id = ?,
                description = ?,
                modified_by = ?

            WHERE id = ?
            `,
            [
                call_subject.trim(),

                call_type ||
                    'Outbound',

                call_status ||
                    'Scheduled',

                start_time,

                Number(
                    duration_minutes || 0
                ),

                Number(
                    duration_seconds || 0
                ),

                call_purpose ||
                    null,

                call_result ||
                    null,

                reminder ||
                    'None',

                call_to_type ||
                    null,

                call_to_id ||
                    null,

                related_to_type ||
                    null,

                related_to_id ||
                    null,

                description?.trim() ||
                    null,

                req.user.id,

                id
            ]
        );


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Call not found'
            });
        }


        res.json({
            success: true,
            message: 'Call updated successfully'
        });

    } catch (error) {

        console.error(
            'Update call error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update call'
        });
    }
};


// ============================================================
// DELETE CALL
// ============================================================

exports.deleteCall = async (req, res) => {

    try {

        const { id } = req.params;

        const [result] = await pool.query(
            `
            DELETE FROM calls
            WHERE id = ?
            `,
            [id]
        );


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Call not found'
            });
        }


        res.json({
            success: true,
            message: 'Call deleted successfully'
        });

    } catch (error) {

        console.error(
            'Delete call error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to delete call'
        });
    }
};


// ============================================================
// GET RELATED RECORDS
// ============================================================

exports.getRelatedRecords = async (req, res) => {

    try {

        const type =
            req.params.type
                .toLowerCase();

        let query = '';

        switch (type) {

            case 'customer':

                query = `
                    SELECT
                        id,
                        company_name AS name
                    FROM customers
                    WHERE is_active = 1
                    ORDER BY company_name
                `;

                break;


            case 'lead':

                query = `
                    SELECT
                        id,
                        lead_name AS name
                    FROM leads
                    WHERE is_active = 1
                    ORDER BY lead_name
                `;

                break;


            case 'product':

                query = `
                    SELECT
                        id,
                        name
                    FROM products
                    WHERE is_active = 1
                    ORDER BY name
                `;

                break;


            case 'campaign':

                query = `
                    SELECT
                        id,
                        name
                    FROM campaigns
                    ORDER BY name
                `;

                break;


            case 'quote':

                query = `
                    SELECT
                        id,
                        quote_number AS name
                    FROM quotes
                    ORDER BY id DESC
                `;

                break;


            case 'sales-order':

                query = `
                    SELECT
                        id,
                        order_number AS name
                    FROM sales_orders
                    ORDER BY id DESC
                `;

                break;


            case 'invoice':

                query = `
                    SELECT
                        id,
                        invoice_number AS name
                    FROM invoices
                    ORDER BY id DESC
                `;

                break;


            case 'contract':

                query = `
                    SELECT
                        id,
                        contract_number AS name
                    FROM contracts
                    ORDER BY id DESC
                `;

                break;


            default:

                return res.json({
                    success: true,
                    data: []
                });
        }


        const [rows] =
            await pool.query(query);


        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(
            'Get related records error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch related records'
        });
    }
};