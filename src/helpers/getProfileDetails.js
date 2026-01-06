const express = require('express');
const db = require('../../db/ConnectionSql');

exports.getProfileDetails = async (data = "") => {
    try {
        let userId = data?.userId;
        console.log("Fetching profile for userId:", userId);
        const [employees] = await db.promise().query(`SELECT user_id, name,is_host ,profile_picture_url FROM users WHERE user_id=?`, [userId]);
        if (employees.length == 0) throw new Error("Employee not found");
        const emp = employees[0];

        return {
            status: true,
            message: "Profile fetched successfully",
            name: emp.name,
            user_id: emp.user_id,
            is_host: emp.is_host,
            profile_picture_url: emp.profile_picture_url,
            reload: false,
            usertype: ""
        };
    } catch (err) {
        return { status: false, message: err.message };
    }
};

