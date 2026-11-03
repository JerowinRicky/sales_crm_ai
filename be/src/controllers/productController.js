const { pool } = require('../config/database');
const { v4: uuid } = require('uuid');

/*
|--------------------------------------------------------------------------
| DOMAINS
|--------------------------------------------------------------------------
*/

/*
 * GET /domains
 */
exports.getDomains = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id,
                uuid,
                name,
                description,
                is_active,
                created_at,
                updated_at
            FROM domains
            WHERE is_active = 1
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get domains error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load domains'
        });
    }
};


/*
 * POST /domains
 */
exports.createDomain = async (req, res) => {
    try {
        const {
            name,
            description
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Domain name is required'
            });
        }

        const domainName = name.trim();

        const [existing] = await pool.query(
            `
            SELECT id
            FROM domains
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
            `,
            [domainName]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'Domain already exists'
            });
        }

        const domainUuid = uuid();

        const [result] = await pool.query(
            `
            INSERT INTO domains
            (
                uuid,
                name,
                description
            )
            VALUES (?, ?, ?)
            `,
            [
                domainUuid,
                domainName,
                description?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Domain created successfully',
            id: result.insertId,
            uuid: domainUuid
        });

    } catch (error) {
        console.error('Create domain error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create domain'
        });
    }
};


/*
 * PUT /domains/:id
 */
exports.updateDomain = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Domain name is required'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE domains
            SET
                name = ?,
                description = ?
            WHERE id = ?
            AND is_active = 1
            `,
            [
                name.trim(),
                description?.trim() || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        res.json({
            success: true,
            message: 'Domain updated successfully'
        });

    } catch (error) {
        console.error('Update domain error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Domain already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update domain'
        });
    }
};


/*
 * DELETE /domains/:id
 */
exports.deleteDomain = async (req, res) => {
    try {
        const [result] = await pool.query(
            `
            UPDATE domains
            SET is_active = 0
            WHERE id = ?
            AND is_active = 1
            `,
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        res.json({
            success: true,
            message: 'Domain deleted successfully'
        });

    } catch (error) {
        console.error('Delete domain error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete domain'
        });
    }
};


/*
|--------------------------------------------------------------------------
| SUBDOMAINS
|--------------------------------------------------------------------------
*/

/*
 * GET /subdomains?domain_id=1
 */
exports.getSubdomains = async (req, res) => {
    try {
        const { domain_id } = req.query;

        let query = `
            SELECT
                id,
                uuid,
                domain_id,
                name,
                description,
                is_active,
                created_at,
                updated_at
            FROM subdomains
            WHERE is_active = 1
        `;
        const params = [];

        if (domain_id) {
            query += ` AND domain_id = ?`;
            params.push(domain_id);
        }

        query += ` ORDER BY name ASC`;

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get subdomains error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load subdomains'
        });
    }
};


/*
 * POST /subdomains
 */
exports.createSubdomain = async (req, res) => {
    try {
        const {
            domain_id,
            name,
            description
        } = req.body;

        if (!domain_id || !name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Domain and subdomain name are required'
            });
        }

        const [domain] = await pool.query(
            `
            SELECT id
            FROM domains
            WHERE id = ?
            AND is_active = 1
            `,
            [domain_id]
        );

        if (!domain.length) {
            return res.status(400).json({
                success: false,
                message: 'Domain not found'
            });
        }

        const [existing] = await pool.query(
            `
            SELECT id
            FROM subdomains
            WHERE domain_id = ?
            AND LOWER(name) = LOWER(?)
            LIMIT 1
            `,
            [
                domain_id,
                name.trim()
            ]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'Subdomain already exists under this domain'
            });
        }

        const subdomainUuid = uuid();

        const [result] = await pool.query(
            `
            INSERT INTO subdomains
            (
                uuid,
                domain_id,
                name,
                description
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                subdomainUuid,
                domain_id,
                name.trim(),
                description?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Subdomain created successfully',
            id: result.insertId,
            uuid: subdomainUuid
        });

    } catch (error) {
        console.error('Create subdomain error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create subdomain'
        });
    }
};


/*
 * PUT /subdomains/:id
 */
exports.updateSubdomain = async (req, res) => {
    try {
        const {
            name,
            description
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Subdomain name is required'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE subdomains
            SET
                name = ?,
                description = ?
            WHERE id = ?
            AND is_active = 1
            `,
            [
                name.trim(),
                description?.trim() || null,
                req.params.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Subdomain not found'
            });
        }

        res.json({
            success: true,
            message: 'Subdomain updated successfully'
        });

    } catch (error) {
        console.error('Update subdomain error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update subdomain'
        });
    }
};


/*
 * DELETE /subdomains/:id
 */
exports.deleteSubdomain = async (req, res) => {
    try {
        const [result] = await pool.query(
            `
            UPDATE subdomains
            SET is_active = 0
            WHERE id = ?
            AND is_active = 1
            `,
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Subdomain not found'
            });
        }

        res.json({
            success: true,
            message: 'Subdomain deleted successfully'
        });

    } catch (error) {
        console.error('Delete subdomain error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete subdomain'
        });
    }
};


/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
*/

/*
 * GET /products?subdomain_id=1
 */
exports.getProducts = async (req, res) => {
    try {
        const { subdomain_id, domain_id, search } = req.query;

        let query = `
            SELECT
                p.id,
                p.uuid,
                p.subdomain_id,
                p.name,
                p.description,
                p.is_active,
                p.created_at,
                p.updated_at,
                s.name AS subdomain_name,
                d.id AS domain_id,
                d.name AS domain_name
            FROM products p
            INNER JOIN subdomains s
                ON p.subdomain_id = s.id
            INNER JOIN domains d
                ON s.domain_id = d.id
            WHERE p.is_active = 1
        `;
        const params = [];

        if (subdomain_id) {
            query += ` AND p.subdomain_id = ?`;
            params.push(subdomain_id);
        }

        if (domain_id) {
            query += ` AND s.domain_id = ?`;
            params.push(domain_id);
        }

        if (search) {
            query += ` AND p.name LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY p.name ASC`;

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get products error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to load products'
        });
    }
};


/*
 * POST /products
 */
exports.createProduct = async (req, res) => {
    try {
        const {
            subdomain_id,
            name,
            description
        } = req.body;

        if (!subdomain_id || !name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Subdomain and product name are required'
            });
        }

        const [subdomain] = await pool.query(
            `
            SELECT id
            FROM subdomains
            WHERE id = ?
            AND is_active = 1
            `,
            [subdomain_id]
        );

        if (!subdomain.length) {
            return res.status(400).json({
                success: false,
                message: 'Subdomain not found'
            });
        }

        const [existing] = await pool.query(
            `
            SELECT id
            FROM products
            WHERE subdomain_id = ?
            AND LOWER(name) = LOWER(?)
            LIMIT 1
            `,
            [
                subdomain_id,
                name.trim()
            ]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'Product already exists under this subdomain'
            });
        }

        const productUuid = uuid();

        const [result] = await pool.query(
            `
            INSERT INTO products
            (
                uuid,
                subdomain_id,
                name,
                description
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                productUuid,
                subdomain_id,
                name.trim(),
                description?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            id: result.insertId,
            uuid: productUuid
        });

    } catch (error) {
        console.error('Create product error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
};


/*
 * PUT /products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        const {
            name,
            description
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE products
            SET
                name = ?,
                description = ?
            WHERE id = ?
            AND is_active = 1
            `,
            [
                name.trim(),
                description?.trim() || null,
                req.params.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Update product error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
};


/*
 * DELETE /products/:id
 */
exports.deleteProduct = async (req, res) => {
    try {
        const [result] = await pool.query(
            `
            UPDATE products
            SET is_active = 0
            WHERE id = ?
            AND is_active = 1
            `,
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
};