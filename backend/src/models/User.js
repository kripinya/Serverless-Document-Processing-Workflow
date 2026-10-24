// ============================================================
// User.js — User model for authentication
// ============================================================
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-south-1'
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_USERS || 'UsersTable';

const UserModel = {
    /**
     * Register a new user
     */
    async create(email, password, name) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {
            userId: uuidv4(),
            email,
            password: hashedPassword,
            name,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        // Check if email already exists
        const existing = await this.getByEmail(email);
        if (existing) {
            throw new Error('Email already registered');
        }

        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: user
        }).promise();

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },

    /**
     * Find user by email
     */
    async getByEmail(email) {
        const result = await dynamoDB.scan({
            TableName: TABLE_NAME,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: { ':email': email }
        }).promise();
        return result.Items?.[0] || null;
    },

    /**
     * Find user by ID
     */
    async getById(userId) {
        const result = await dynamoDB.get({
            TableName: TABLE_NAME,
            Key: { userId }
        }).promise();
        if (result.Item) {
            const { password: _, ...user } = result.Item;
            return user;
        }
        return null;
    },

    /**
     * Verify password
     */
    async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
};

module.exports = UserModel;
