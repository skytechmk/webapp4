import { db } from '../config/db.js';
import { getIo } from '../services/socket.js';

export const getUsers = (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden", status: 403 });
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

export const updateUser = (req, res) => {
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isSelf && !isAdmin) return res.status(403).json({ error: "Forbidden", status: 403 });

    const { name, email, studioName, logoUrl, watermarkOpacity, watermarkSize, watermarkPosition, watermarkOffsetX, watermarkOffsetY, role, tier, storageLimitMb } = req.body;

    db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push("name = ?"); values.push(name); }
        if (email !== undefined) { updates.push("email = ?"); values.push(email); }
        if (studioName !== undefined) { updates.push("studioName = ?"); values.push(studioName); }
        if (logoUrl !== undefined) { updates.push("logoUrl = ?"); values.push(logoUrl); }
        if (watermarkOpacity !== undefined) { updates.push("watermarkOpacity = ?"); values.push(watermarkOpacity); }
        if (watermarkSize !== undefined) { updates.push("watermarkSize = ?"); values.push(watermarkSize); }
        if (watermarkPosition !== undefined) { updates.push("watermarkPosition = ?"); values.push(watermarkPosition); }
        if (watermarkOffsetX !== undefined) { updates.push("watermarkOffsetX = ?"); values.push(watermarkOffsetX); }
        if (watermarkOffsetY !== undefined) { updates.push("watermarkOffsetY = ?"); values.push(watermarkOffsetY); }
        if (role !== undefined && isAdmin) { updates.push("role = ?"); values.push(role); }
        if (tier !== undefined && isAdmin) { updates.push("tier = ?"); values.push(tier); }
        if (storageLimitMb !== undefined && isAdmin) { updates.push("storageLimitMb = ?"); values.push(storageLimitMb); }

        if (updates.length === 0) return res.status(400).json({ error: "No valid fields to update" });

        const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
        values.push(req.params.id);

        db.run(query, values, function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Get updated user data
            db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, updatedUser) => {
                if (err) return res.status(500).json({ error: err.message });

                // Emit user update to all connected clients
                const io = getIo();
                console.log('Emitting user_updated event for user:', updatedUser.id, 'tier:', updatedUser.tier);
                io.emit('user_updated', updatedUser);

                res.json({ success: true, user: updatedUser });
            });
        });
    });
};

export const upgradeUser = (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden", status: 403 });
    const { tier } = req.body;
    db.run("UPDATE users SET tier = ? WHERE id = ?", [tier, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Get updated user data
        db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, updatedUser) => {
            if (err) return res.status(500).json({ error: err.message });

            // Emit user update to all connected clients
            const io = getIo();
            console.log('Emitting user_updated event (upgradeUser) for user:', updatedUser.id, 'tier:', updatedUser.tier);
            io.emit('user_updated', updatedUser);

            res.json({ success: true, user: updatedUser });
        });
    });
};

export const deleteUser = (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden", status: 403 });
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
};
