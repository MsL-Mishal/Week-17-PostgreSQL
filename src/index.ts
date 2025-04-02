import pool from "./db";
import express from "express";
import zod from "zod";
import bcrypt from "bcrypt";

const saltRounds = 10;
const port = 3000;
const app = express();

app.use(express.json());

// Defining Zod Schemas
const usernameSchema = zod.string().regex(/^[a-z A-Z\d]{2,20}$/);
const emailSchema = zod.string().email();
const passwordSchema = zod.string();
const citySchema = zod.string();
const countrySchema = zod.string();
const streetSchema = zod.string();
const pincodeSchema = zod.string();

app.post('/signup', async (req, res) => {

    try {
        const { username, email, password, city, country, street, pincode } = req.body;

        // Validating the data
        const usernameResponse = usernameSchema.safeParse(username);
        const emailResponse = emailSchema.safeParse(email);
        const passwordResponse = passwordSchema.safeParse(password);
        const cityResponse = citySchema.safeParse(city);
        const countryResponse = countrySchema.safeParse(country);
        const streetResponse = streetSchema.safeParse(street);
        const pincodeResponse = pincodeSchema.safeParse(pincode);

        // If any of the data is invalid, we will return a 401 status code with a message saying "Invalid Entry".
        if( !usernameResponse.success || !emailResponse.success || !passwordResponse.success || !cityResponse.success || !countryResponse.success || !streetResponse.success || !pincodeResponse.success )
        {
            res.status(401).json({
                message : "Invalid Entry"
            })
        }

        // Hashing the password to store it securely in the database
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        /*
        
        To avoid a situation where only some of the data is inserted into the database, we can use transactions. In this way, if an error occurs during the insertion of data, we can roll back the transaction and avoid inserting partial data into the database. So, either both the data is inserted or none of it is inserted. We mainly make use of the BEGIN, COMMIT, and ROLLBACK commands to implement transactions in PostgreSQL. 
        
        */

        //  Here is how we can use transactions in our code:

        // Start transaction
        await pool.query("BEGIN");

        // Queries to insert data into the 'users' and 'addresses' tables
        const insertToUsersQuery = `
            INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id;`;

        const insertToAddressesQuery = `
            INSERT INTO addresses (user_id, city, country, street, pincode) VALUES ($1, $2, $3, $4, $5);
        `;

        // Insert data into the 'users' table
        const usersRes = await pool.query(insertToUsersQuery, [username, email, hashedPassword]);

        console.log("Inserted Data Successfully into 'users' table");

        const userId = usersRes.rows[0].id; // Saving the id returned after running the insert query

        // Insert data into the 'addresses' table
        await pool.query(insertToAddressesQuery, [userId, city, country, street, pincode]); // Insert address using the returned user ID

        console.log("Inserted Data Successfully into 'addresses' table");

        // Commit transaction if all queries are successful
        await pool.query("COMMIT");

        res.status(201).json({
            message : "Data Inserted Successfully"
        });
    }

    catch(error) {
        await pool.query("ROLLBACK"); // Roll back the transaction when an error occurs

        console.error('Error during transaction, rolled back.', error);

        res.status(500).json({
            message : "Error Inserting Data"
        });
    }

    finally {
        // await pool.end();   // Close the connection after the transaction is completed
    }
});

// @ts-ignore
app.get('/user/badapproach', async (req, res) => {
    /* 
    In this approach, we are fetching the data from the 'users' and 'addresses' tables separately. This can be a bad approach in certain situations, since we are not using joins to fetch the data from both tables. This can lead to performance issues when the data in the tables grows. In such cases, we can use joins to fetch the data from both tables in a single query. 

    It's also ideal to do a single query to fetch the data from both tables, as it reduces the number of queries to the database, which can improve the performance of the application. But, we should also consider the overhead of joining the tables, as it can be slow if the tables have a large number of rows. In such cases, we can use indexes to speed up the join operation. Indexes are used to speed up the retrieval of data from the tables. We can create indexes on the columns that are used in the join operation to speed up the join operation.

    Moreover, it's better to do transactions when inserting data into multiple tables, as it ensures that either all the data is inserted or none of it is inserted. This avoids a situation where only some of the data is inserted into the database. We mainly make use of the BEGIN, COMMIT, and ROLLBACK commands to implement transactions in PostgreSQL.
    
    */

    try {
        // getting the user id from the query parameter
        const user_id = req.query.id;
    
        // Query to fetch user data
        const getUserQuery = `
            SELECT id, username, email FROM users WHERE id = $1;
        `;
    
        // Fetching the user data
        const userRes = await pool.query(getUserQuery, [user_id]);
    
        // If the user is not found, return a 404 status code with a message saying "User Not Found".
        if(userRes.rows.length === 0) {
            return res.status(404).json({
                message : "User Not Found"
            });
        }
    
        // If the user is found, return the user data
        const user = userRes.rows[0];   
    
        // Query to fetch addresses data
        const getAddressesQuery = `
            SELECT * FROM addresses WHERE user_id = $1;
        `;
    
        // Fetching the addresses data
        const addressesRes = await pool.query(getAddressesQuery, [user_id]);
    
        // If the user has no addresses, return an empty array. Otherwise, return the addresses data.
        const addresses = addressesRes.rows;
    
        // Return the user and addresses data
        res.status(200).json({
            user,
            addresses
        });
    }

    catch(error) {
        console.error('Error Fetching Data', error);

        res.status(500).json({
            message : "Error Fetching Data"
        });
    
    }
});

// @ts-ignore
app.get('/user/goodapproach', async (req, res) => {
    /* 

    Benefits of using a join - 
        Reduced Latency
        Simplified Application Logic
        Transactional Integrity
 
    
    This is a better approach as we are using joins to fetch the data from both tables. This can improve the performance when the data in the tables grows. We can use joins to fetch the data from both tables in a single query.

    But joins has a problem of its own. If we have a large number of rows in the tables, the join operation can be slow. In such cases, we can use indexes to speed up the join operation. Indexes are used to speed up the retrieval of data from the tables. We can create indexes on the columns that are used in the join operation to speed up the join operation.

    Another problem with joins is that if we have a large number of rows in the tables, the join operation can return a large number of rows. In such cases, we can use the `DISTINCT` keyword to remove duplicate rows from the result set. The `DISTINCT` keyword is used to remove duplicate rows from the result set. 
    
    The syntax for using the `DISTINCT` keyword is as follows:

    SELECT DISTINCT column1, column2, ...
    FROM table_name;

    The `DISTINCT` keyword is used to remove duplicate rows from the result set. The `DISTINCT` keyword is used with the `SELECT` statement to remove duplicate rows from the result set. The `DISTINCT` keyword is used to remove duplicate rows from the result set. The `DISTINCT` keyword is used with the `SELECT` statement to remove duplicate rows from the result set. 
    
    */


    /* 

    JOINS IN PostgreSQL :

    The `JOIN` keyword is used to fetch data from two or more tables based on a related column between them. It returns rows when there is at least one match in both tables. If there is no match, the rows are not returned. By default, the `JOIN` keyword is used as an `INNER JOIN`.

    The syntax for using the `INNER JOIN` keyword is as follows:

    SELECT column_name(s)
    FROM table1
    INNER JOIN table2
    ON table1.column_name = table2.column_name;
    
    Other types of joins are:
    1. `LEFT JOIN` or `LEFT OUTER JOIN`
    2. `RIGHT JOIN` or `RIGHT OUTER JOIN`
    3. `FULL JOIN` or `FULL OUTER JOIN`
    4. `CROSS JOIN`

    Let's see what each of these joins does:

    1. `LEFT JOIN` or `LEFT OUTER JOIN` : The `LEFT JOIN` keyword returns all the rows from the left table (table1), along with the matched rows from the right table (table2). The result is `NULL` from the right side if there is no match.

    The syntax for using the `LEFT JOIN` keyword is as follows:

    SELECT column_name(s)
    FROM table1
    LEFT JOIN table2
    ON table1.column_name = table2.column_name;

    2. `RIGHT JOIN` or `RIGHT OUTER JOIN` : The `RIGHT JOIN` keyword returns all the rows from the right table (table2), along with the matched rows from the left table (table1). The result is `NULL` from the left side when there is no match.

    The syntax for using the `RIGHT JOIN` keyword is as follows:

    SELECT column_name(s)
    FROM table1
    RIGHT JOIN table2
    ON table1.column_name = table2.column_name;

    3. `FULL JOIN` or `FULL OUTER JOIN` : The `FULL JOIN` keyword returns all the rows when there is a match in either the left (table1) or right (table2) table. The result is `NULL` from both sides when there is no match.

    The syntax for using the `FULL JOIN` keyword is as follows:

    SELECT column_name(s)
    FROM table1
    FULL JOIN table2
    ON table1.column_name = table2.column_name;

    4. `CROSS JOIN` : The `CROSS JOIN` keyword returns the Cartesian product of the two tables. That is, it returns all the rows from the left table (table1) multiplied by all the rows from the right table (table2).

    The syntax for using the `CROSS JOIN` keyword is as follows:

    SELECT column_name(s)
    FROM table1
    CROSS JOIN
    table2;

    The difference between `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL JOIN`, and `CROSS JOIN` is that `INNER JOIN` returns rows when there is at least one match in both tables, `LEFT JOIN` returns all the rows from the left table along with the matched rows from the right table, `RIGHT JOIN` returns all the rows from the right table along with the matched rows from the left table, `FULL JOIN` returns all the rows when there is a match in either the left or right table, and `CROSS JOIN` returns the Cartesian product of the two tables.
    
    */

    // Here, we are doing an inner join on the 'users' and 'addresses' tables using the 'user_id' column. This will fetch the data from both tables in a single query.

    try {
        // getting the user id from the query parameter
        const user_id = req.query.id;
    
        // Query to fetch user and addresses data using joins
        const getUsersAndAddressesQuery = `
            SELECT users.id, users.username, users.email, addresses.city, addresses.country, addresses.street, addresses.pincode
            FROM users
            JOIN addresses
            ON users.id = addresses.user_id
            WHERE users.id = $1;
        `;
    
        const usersAndAddressesRes = await pool.query(getUsersAndAddressesQuery, [user_id]);
    
        if(usersAndAddressesRes.rows.length === 0) {
            return res.status(404).json({
                message : "User Not Found"
            });
        }
    
        const userAndAddresses = usersAndAddressesRes.rows[0];
    
        res.status(200).json({
            userAndAddresses
        });
    }

    catch(error) {
        console.error('Error Fetching Data', error);

        res.status(500).json({
            message : "Error Fetching Data"
        });
    }
});

app.listen(port);
