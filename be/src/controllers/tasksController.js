const { pool } = require('../config/database');

/*
|--------------------------------------------------------------------------
| TASKS
|--------------------------------------------------------------------------
*/

/*
 * GET /tasks
 *
 * Get all tasks
 */
exports.getTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 15,
            search = '',
            status = '',
            priority = '',
            related_to_type = '',
            tab = '',
            owner_id = '',
            scope = 'me'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 15));
        const offset = (pageNum - 1) * limitNum;

        const baseConditions = [];
        const baseParams = [];

        // Access control:
        // - Non-admin users: can ONLY see their own tasks
        // - Admin users:
        //    * Default (scope !== 'all'): see only their own tasks ("for me only")
        //    * scope === 'all': see all tasks across all users (can optionally filter by owner_id)
        const isAdmin = req.user && req.user.role_name === 'admin';
        const isMeOnly = !isAdmin || scope === 'me';

        if (isMeOnly) {
            baseConditions.push('t.task_owner_id = ?');
            baseParams.push(req.user.id);
        } else if (owner_id) {
            baseConditions.push('t.task_owner_id = ?');
            baseParams.push(owner_id);
        }

        const baseWhereSql = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';

        // Tab counts based on user permissions
        const [countsResult] = await pool.query(`
            SELECT
                COUNT(*) AS count_all,
                SUM(CASE WHEN t.related_to_type = 'Lead' THEN 1 ELSE 0 END) AS count_lead,
                SUM(CASE WHEN t.related_to_type IS NULL OR t.related_to_type != 'Lead' THEN 1 ELSE 0 END) AS count_normal
            FROM tasks t
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
            whereConditions.push("t.related_to_type = 'Lead'");
        } else if (tab === 'normal') {
            whereConditions.push("(t.related_to_type IS NULL OR t.related_to_type != 'Lead')");
        } else if (related_to_type) {
            whereConditions.push('t.related_to_type = ?');
            params.push(related_to_type);
        }

        if (status) {
            whereConditions.push('t.task_status = ?');
            params.push(status);
        }

        if (priority) {
            whereConditions.push('t.priority = ?');
            params.push(priority);
        }

        if (search && search.trim()) {
            const q = `%${search.trim()}%`;
            whereConditions.push(`(
                t.task_subject LIKE ?
                OR t.description LIKE ?
                OR u.name LIKE ?
                OR cu.company_name LIKE ?
                OR l.title LIKE ?
                OR p.name LIKE ?
            )`);
            params.push(q, q, q, q, q, q);
        }

        const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count total matching tasks
        const [countResult] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM tasks t
            LEFT JOIN users u ON t.task_owner_id = u.id
            LEFT JOIN customers cu ON t.related_to_type = 'Customer' AND t.related_to_id = cu.id
            LEFT JOIN leads l ON t.related_to_type = 'Lead' AND t.related_to_id = l.id
            LEFT JOIN products p ON t.related_to_type = 'Product' AND t.related_to_id = p.id
            ${whereSql}
        `, params);

        const total = countResult[0]?.total || 0;

        // Fetch paginated tasks
        const [rows] = await pool.query(`
            SELECT
                t.id,
                t.task_subject,
                t.due_date,
                t.completed_date,
                t.task_status,
                t.reminder,
                t.priority,
                t.task_owner_id,
                t.task_to_type,
                t.task_to_id,
                t.related_to_type,
                t.related_to_id,
                t.description,
                t.created_at,
                t.updated_at,
                u.name AS task_owner_name,
                CASE
                    WHEN t.related_to_type = 'Customer' THEN cu.company_name
                    WHEN t.related_to_type = 'Lead' THEN l.title
                    WHEN t.related_to_type = 'Product' THEN p.name
                    ELSE NULL
                END AS related_name
            FROM tasks t
            LEFT JOIN users u ON t.task_owner_id = u.id
            LEFT JOIN customers cu ON t.related_to_type = 'Customer' AND t.related_to_id = cu.id
            LEFT JOIN leads l ON t.related_to_type = 'Lead' AND t.related_to_id = l.id
            LEFT JOIN products p ON t.related_to_type = 'Product' AND t.related_to_id = p.id
            ${whereSql}
            ORDER BY t.created_at DESC
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
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load tasks'
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET RELATED RECORDS
|--------------------------------------------------------------------------
*/

/*
 * GET /tasks/related/:type
 *
 * Supported:
 * customer
 * lead
 * product
 * campaign
 * quote
 * sales-order
 * invoice
 * contract
 */
exports.getRelatedRecords = async (req, res) => {
    try {

        const { type } = req.params;

        let query = '';

        switch (type.toLowerCase()) {

            /*
            |--------------------------------------------------------------------------
            | CUSTOMER
            |--------------------------------------------------------------------------
            */

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


            /*
            |--------------------------------------------------------------------------
            | LEAD
            |--------------------------------------------------------------------------
            */

            case 'lead':

                query = `
                    SELECT
                        id,
                        title AS name
                    FROM leads
                    ORDER BY title ASC
                `;

                break;


            /*
            |--------------------------------------------------------------------------
            | PRODUCT
            |--------------------------------------------------------------------------
            */

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


            /*
            |--------------------------------------------------------------------------
            | CAMPAIGN
            |--------------------------------------------------------------------------
            */

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


            /*
            |--------------------------------------------------------------------------
            | QUOTE
            |--------------------------------------------------------------------------
            */

            case 'quote':

                query = `
                    SELECT
                        id,
                        quote_number AS name
                    FROM quotes
                    ORDER BY quote_number ASC
                `;

                break;


            /*
            |--------------------------------------------------------------------------
            | SALES ORDER
            |--------------------------------------------------------------------------
            */

            case 'sales-order':

                query = `
                    SELECT
                        id,
                        order_number AS name
                    FROM sales_orders
                    ORDER BY order_number ASC
                `;

                break;


            /*
            |--------------------------------------------------------------------------
            | INVOICE
            |--------------------------------------------------------------------------
            */

            case 'invoice':

                query = `
                    SELECT
                        id,
                        invoice_number AS name
                    FROM invoices
                    ORDER BY invoice_number ASC
                `;

                break;


            /*
            |--------------------------------------------------------------------------
            | CONTRACT
            |--------------------------------------------------------------------------
            */

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

        console.error('Related records error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load related records'
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET TASK BY ID
|--------------------------------------------------------------------------
*/

/*
 * GET /tasks/:id
 */
exports.getTaskById = async (req, res) => {
    try {

        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                t.id,
                t.task_subject,
                t.due_date,
                t.completed_date,
                t.task_status,
                t.reminder,
                t.priority,
                t.task_owner_id,
                t.task_to_type,
                t.task_to_id,
                t.related_to_type,
                t.related_to_id,
                t.description,
                t.created_at,
                t.updated_at,
        
                u.name AS task_owner_name,
        
                c.contact_name AS task_to_name,
        
                CASE
                    WHEN t.related_to_type = 'Customer'
                        THEN cu.company_name
        
                    WHEN t.related_to_type = 'Lead'
                        THEN l.title
        
                    WHEN t.related_to_type = 'Product'
                        THEN p.name
        
                    ELSE NULL
                END AS related_name
        
            FROM tasks t
        
            LEFT JOIN users u
                ON t.task_owner_id = u.id
        
            LEFT JOIN contacts c
                ON t.task_to_type = 'Contact'
                AND t.task_to_id = c.id
        
            LEFT JOIN customers cu
                ON t.related_to_type = 'Customer'
                AND t.related_to_id = cu.id
        
            LEFT JOIN leads l
                ON t.related_to_type = 'Lead'
                AND t.related_to_id = l.id
        
            LEFT JOIN products p
                ON t.related_to_type = 'Product'
                AND t.related_to_id = p.id
        
            WHERE t.id = ?
        
            LIMIT 1
        `, [id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Access control: non-admin can only view their own tasks
        if (req.user && req.user.role_name !== 'admin' && rows[0].task_owner_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You can only view your own tasks'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {

        console.error('Get task error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load task'
        });
    }
};


/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

/*
 * POST /tasks
 */
exports.createTask = async (req, res) => {
    try {

        const {
            task_subject,
            due_date,
            completed_date,
            task_status,
            reminder,
            priority,
            task_to_type,
            task_to_id,
            related_to_type,
            related_to_id,
            description
        } = req.body;


        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!task_subject || !task_subject.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Task subject is required'
            });
        }

        if (!due_date) {

            return res.status(400).json({
                success: false,
                message: 'Due date is required'
            });
        }


        /*
        |--------------------------------------------------------------------------
        | TASK OWNER
        |--------------------------------------------------------------------------
        |
        | Owner comes from authenticated user.
        | Do NOT trust task_owner_id from frontend.
        |
        */

        const task_owner_id = req.user.id;


        /*
        |--------------------------------------------------------------------------
        | INSERT TASK
        |--------------------------------------------------------------------------
        */

        const [result] = await pool.query(
            `
            INSERT INTO tasks
            (
                task_subject,
                due_date,
                completed_date,
                task_status,
                reminder,
                priority,
                task_owner_id,
                task_to_type,
                task_to_id,
                related_to_type,
                related_to_id,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                task_subject.trim(),
                due_date,
                completed_date || null,
                task_status || 'Not Started',
                reminder ? 1 : 0,
                priority || 'Medium',
                task_owner_id,
                task_to_type || null,
                task_to_id || null,
                related_to_type || null,
                related_to_id || null,
                description?.trim() || null
            ]
        );


        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            id: result.insertId
        });

    } catch (error) {

        console.error('Create task error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create task'
        });
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE TASK
|--------------------------------------------------------------------------
*/

/*
 * PUT /tasks/:id
 */
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Access control: non-admin can only update their own tasks
        if (req.user && req.user.role_name !== 'admin') {
            const [check] = await pool.query('SELECT task_owner_id FROM tasks WHERE id = ?', [id]);
            if (!check.length) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            if (check[0].task_owner_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only edit your own tasks'
                });
            }
        }

        const {
            task_subject,
            due_date,
            completed_date,
            task_status,
            reminder,
            priority,
            task_to_type,
            task_to_id,
            related_to_type,
            related_to_id,
            description
        } = req.body;


        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!task_subject || !task_subject.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Task subject is required'
            });
        }

        if (!due_date) {

            return res.status(400).json({
                success: false,
                message: 'Due date is required'
            });
        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE
        |--------------------------------------------------------------------------
        */

        const [result] = await pool.query(
            `
            UPDATE tasks
            SET
                task_subject = ?,
                due_date = ?,
                completed_date = ?,
                task_status = ?,
                reminder = ?,
                priority = ?,
                task_to_type = ?,
                task_to_id = ?,
                related_to_type = ?,
                related_to_id = ?,
                description = ?
            WHERE id = ?
            `,
            [
                task_subject.trim(),
                due_date,
                completed_date || null,
                task_status || 'Not Started',
                reminder ? 1 : 0,
                priority || 'Medium',
                task_to_type || null,
                task_to_id || null,
                related_to_type || null,
                related_to_id || null,
                description?.trim() || null,
                id
            ]
        );


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }


        res.json({
            success: true,
            message: 'Task updated successfully'
        });

    } catch (error) {

        console.error('Update task error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update task'
        });
    }
};


/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

/*
 * DELETE /tasks/:id
 */
exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Access control: non-admin can only delete their own tasks
        if (req.user && req.user.role_name !== 'admin') {
            const [check] = await pool.query('SELECT task_owner_id FROM tasks WHERE id = ?', [id]);
            if (!check.length) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            if (check[0].task_owner_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only delete your own tasks'
                });
            }
        }

        const [result] = await pool.query(
            `
            DELETE FROM tasks
            WHERE id = ?
            `,
            [id]
        );


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }


        res.json({
            success: true,
            message: 'Task deleted successfully'
        });

    } catch (error) {

        console.error('Delete task error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete task'
        });
    }
};