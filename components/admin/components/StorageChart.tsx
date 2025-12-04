/**
 * Storage Chart Component
 * Displays user storage usage with bar chart
 */

import * as React from 'react';
import { User } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StorageChartProps {
    users: User[];
}

export const StorageChart: React.FC<StorageChartProps> = ({ users }) => {
    const storageData = users.map(u => ({
        name: u.name.split(' ')[0],
        used: u.storageUsedMb,
        limit: u.storageLimitMb
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={storageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="used" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="Used (MB)" />
            </BarChart>
        </ResponsiveContainer>
    );
};