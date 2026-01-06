router.get("/getHostProfile", async (req, res) => {
    const userId = req.user.user_id;
    const { page = 1, limit = 10, search = "", status = "", type = 1 } = req.query;

    try {
        let query = "SELECT * FROM host_profiles WHERE type=? ";
        const queryParams = [type];

        if (status) {
            query += " AND status = ?";
            queryParams.push(status);
        }
        if (search) {
            query += " AND (host_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY user_id DESC LIMIT ? OFFSET ?";
        queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [user] = await db.promise().query(query, queryParams);
        if (user.length === 0) {
            return res.status(200).json({ status: false, message: "User not found" });
        }
        let queryCount = "SELECT COUNT(host_id) as total FROM host_profiles WHERE 1=1";
        let countParams = [];
        if (search) {
            queryCount += " AND (host_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const [userCount] = await db.promise().query(queryCount, countParams);
        res.json({ status: true, data: user, total: userCount[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});