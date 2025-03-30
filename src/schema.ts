import pool from "./db";

async function createTable() {
    const createUsersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createAddressesTableQuery = `
        CREATE TABLE IF NOT EXISTS addresses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            city VARCHAR(100) NOT NULL,
            country VARCHAR(100) NOT NULL,
            street VARCHAR(100) NOT NULL,
            pincode VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `; // `ON DELETE CASCADE` command in the above code ensures that if a user is deleted, all the addresses associated with that user are also deleted.

    // Similarly, we can use the `ON UPDATE CASCADE` command to update the addresses associated with a user if the user's id is updated.

    // Similarly, we can use the `ON DELETE RESTRICT` command to restrict the deletion of a user if there are any addresses associated with that user. This is the default behavior in PostgreSQL. So, if we do not specify any `ON DELETE` command, the default behavior is `ON DELETE RESTRICT`. In that case, we'll first need to delete the addresses associated with a user before deleting the user.

    // Similarly, we can use the `ON DELETE NO ACTION` command to restrict the deletion of a user if there are any addresses associated with that user. This is the default behavior in PostgreSQL.

    // The difference between `ON DELETE RESTRICT` and `ON DELETE NO ACTION` is that `ON DELETE RESTRICT` is the default behavior in PostgreSQL, whereas `ON DELETE NO ACTION` is used to explicitly specify that the deletion of a user is restricted if there are any addresses associated with that user.

    // Similarly, we can use the `ON DELETE SET NULL` command to set the user_id in the addresses table to NULL if the user is deleted. This is useful when we want to keep the addresses even if the user is deleted.

    try {
        await pool.query(createUsersTableQuery);
        console.log("Users Table Created Successfully");

        await pool.query(createAddressesTableQuery);
        console.log("Addresses Table Created Successfully");
    }

    catch(error) {
        console.log("Error Creating Table : ", error);
    }
}

createTable();