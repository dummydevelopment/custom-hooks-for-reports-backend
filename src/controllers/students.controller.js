import { neonQuery } from "../db/neonPostgresDB.js";


// ==============================
// GET ALL STUDENTS
// ==============================
export const studentFieldMap = {
    id: {
        db: "student_id",
    },

    "name.first_name": {
        db: "first_name",
    },

    "name.last_name": {
        db: "last_name",
    },

    gender: {
        db: "gender",
    },

    age: {
        db: "age",
    },

    "classInfo.class": {
        db: "class",
    },

    "classInfo.section": {
        db: "section",
    },

    "address.city": {
        db: "city",
    },

    "address.country": {
        db: "country",
    },
};

export const formatStudent = (student) => {

    const formatted = {};

    Object.entries(studentFieldMap).forEach(([accessor, config]) => {

        const keys = accessor.split(".");

        let current = formatted;

        // create nested objects
        for (let i = 0; i < keys.length - 1; i++) {

            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }

            current = current[keys[i]];
        }

        // set final value
        current[keys[keys.length - 1]] =
            student[config.db];
    });

    return formatted;
};

export const getStudents = async (req, res) => {

    try {

        let {
            limit = 10,
            skip = 0,
            search = "",
            sortBy = "id",
            order = "asc",
            class: className,
            section,
            classes = "",
            sections = "",
            gender,
            country,
            city,



        } = req.query;
        classes = classes
            ? classes.split(",")
            : [];

        sections = sections
            ? sections.split(",")
            : [];
        let isAll = limit === "all";

        limit = isAll ? null : Number(limit);
        // limit = Number(limit);
        skip = Number(skip);

        // ✅ frontend accessor -> DB column
        sortBy =
            studentFieldMap[sortBy]?.db ||
            "student_id";

        // ✅ sanitize order
        order =
            order.toLowerCase() === "desc"
                ? "DESC"
                : "ASC";

        let queryParams = [];
        let conditions = [];

        // ✅ search
        if (search.trim()) {

            const searchableColumns = [
                "first_name",
                "last_name",
                "gender",
                "city",
                "country",
                "class",
                "section",
            ];

            const searchConditions = searchableColumns.map(
                (column, index) =>
                    `CAST(${column} AS TEXT) ILIKE $${index + 1}`
            );

            conditions.push(`(${searchConditions.join(" OR ")})`);

            queryParams.push(...searchableColumns.map(() => `%${search}%`));
        }

        // ==============================
        // CLASS FILTER
        // ==============================
        if (className) {
            queryParams.push(className);
            conditions.push(`class = $${queryParams.length}`);
        }

        // ==============================
        // SECTION FILTER
        // ==============================
        if (section) {
            queryParams.push(section);
            conditions.push(`section = $${queryParams.length}`);
        }

        if (classes.length) {

            queryParams.push(classes);

            conditions.push(
                `class = ANY($${queryParams.length})`
            );
        }
        if (sections.length) {

            queryParams.push(sections);

            conditions.push(
                `section = ANY($${queryParams.length})`
            );
        }
        if (gender) {

            queryParams.push(gender);

            conditions.push(
                `gender = $${queryParams.length}`
            );
        }
        if (country) {

            const countries = country
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);

            if (countries.length) {

                queryParams.push(countries);

                conditions.push(
                    `country = ANY($${queryParams.length})`
                );
            }
        }
        if (city) {

            const cities = city
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);

            if (cities.length) {

                queryParams.push(cities);

                conditions.push(
                    `city = ANY($${queryParams.length})`
                );
            }
        }

        // ==============================
        // FINAL WHERE CLAUSE
        // ==============================
        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // ==============================
        // TOTAL COUNT
        // ==============================
        const totalQuery = `
            SELECT COUNT(*) 
            FROM students
            ${whereClause}
        `;

        const totalResult = await neonQuery(
            totalQuery,
            queryParams
        );

        const total = Number(totalResult.rows[0].count);

        // ✅ pagination
        let studentsQuery = `
            SELECT *
            FROM students
            ${whereClause}
            ORDER BY ${sortBy} ${order}
        `;

        // ✅ apply pagination only if limit > 0
        if (!isAll) {

            const limitIndex =
                queryParams.length + 1;

            const skipIndex =
                queryParams.length + 2;

            studentsQuery += `
                LIMIT $${limitIndex}
                OFFSET $${skipIndex}
            `;

            queryParams.push(limit);
            queryParams.push(skip);
        }

        const result = await neonQuery(
            studentsQuery,
            queryParams
        );

        // ✅ central formatter
        const formattedStudents =
            result.rows.map(formatStudent);

        return res.status(200).json({
            success: true,
            total,
            limit,
            skip,
            // students: formattedStudents,
            data: formattedStudents,
        });

    } catch (error) {

        console.error(
            "❌ Get Students Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};


// ==============================
// GET STUDENT BY ID
// ==============================
export const getStudentById = async (req, res) => {

    try {

        const { id } = req.params;

        const result = await neonQuery(
            `SELECT * FROM students WHERE student_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        const student = result.rows[0];

        const formattedStudent = {
            id: student.student_id,

            name: {
                first_name: student.first_name,
                last_name: student.last_name,
            },

            gender: student.gender,

            age: student.age,

            classInfo: {
                class: student.class,
                section: student.section,
            },

            address: {
                city: student.city,
                country: student.country,
            },
        };

        return res.status(200).json({
            success: true,
            student: formattedStudent,
        });

    } catch (error) {

        console.error("❌ Get Student By ID Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// ==============================
// GET UNIQUE CLASSES
// ==============================
export const getUniqueClasses = async (req, res) => {

    try {

        const result = await neonQuery(`
            SELECT DISTINCT class
            FROM students
            ORDER BY class ASC
        `);

        const classes = result.rows.map(
            (item) => item.class
        );

        return res.status(200).json({
            success: true,
            total: classes.length,
            classes,
        });

    } catch (error) {

        console.error(
            "❌ Get Unique Classes Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};



// ==============================
// GET SECTIONS BY CLASS
// ==============================
export const getSectionsByClass = async (req, res) => {

    try {

        const { class: className } = req.params;

        const result = await neonQuery(
            `
            SELECT DISTINCT section
            FROM students
            WHERE class = $1
            ORDER BY section ASC
            `,
            [className]
        );

        const sections = result.rows.map(
            (item) => item.section
        );

        return res.status(200).json({
            success: true,
            class: className,
            total: sections.length,
            sections,
        });

    } catch (error) {

        console.error(
            "❌ Get Sections By Class Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};
export const getSections = async (req, res) => {

    try {

        let {
            classes = "",
        } = req.query;

        // convert to array
        classes = classes
            ? classes.split(",")
            : [];

        let query = `
            SELECT DISTINCT section
            FROM students
        `;

        let params = [];

        // MULTI CLASS FILTER
        if (classes.length) {

            params.push(classes);

            query += `
                WHERE class = ANY($1)
            `;
        }

        query += `
            ORDER BY section ASC
        `;

        const result = await neonQuery(
            query,
            params
        );

        const sections =
            result.rows.map(
                (r) => r.section
            );

        return res.status(200).json({
            success: true,
            total: sections.length,
            sections,
        });

    } catch (error) {

        console.error(
            "❌ Get Sections Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};
// ==============================
// GET UNIQUE COUNTRIES
// ==============================
export const getCountries = async (req, res) => {

    try {

        const result = await neonQuery(`
            SELECT DISTINCT country
            FROM students
            WHERE country IS NOT NULL
            ORDER BY country ASC
        `);

        const countries = result.rows.map(
            (item) => item.country
        );

        return res.status(200).json({
            success: true,
            total: countries.length,
            options: countries,
        });

    } catch (error) {

        console.error(
            "❌ Get Countries Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};
export const getCities = async (req, res) => {
    try {
        let { country } = req.query;

        // normalize input → always array
        if (!country) {
            return res.status(200).json({
                success: true,
                total: 0,
                options: [],
            });
        }

        const countryList = Array.isArray(country)
            ? country
            : country.split(","); // "India,USA"

        const result = await neonQuery(`
            SELECT DISTINCT city
            FROM students
            WHERE country = ANY($1)
              AND city IS NOT NULL
            ORDER BY city ASC
        `, [countryList]);

        const cities = result.rows.map(
            (item) => item.city
        );

        return res.status(200).json({
            success: true,
            total: cities.length,
            options: cities,
        });

    } catch (error) {
        console.error("❌ Get Cities Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};