import express from "express";
import { getCities, getCountries, getSections, getSectionsByClass, getStudentById, getStudents, getUniqueClasses } from "../controllers/students.controller.js";
import { getMarks, getMarksByStudentId } from "../controllers/marks.controller.js";

// import {
//     getStudents,
//     getStudentById
// } from "../controllers/reports/students.controller.js";

// import {
//     getMarks,
//     getMarksByStudentId
// } from "../controllers/reports/marks.controller.js";

const router = express.Router();

router.get("/students", getStudents);
// router.get("/students/:id", getStudentById);

router.get("/marks", getMarks);
// router.get("/marks/student/:studentId", getMarksByStudentId);

// routes/reports.routes.js

router.get("/students/classes", getUniqueClasses);

// router.get("/students/classes/:class/sections",getSectionsByClass);
router.get("/students/sections",getSections);
router.get("/students/countries", getCountries);
router.get("/students/cities", getCities);
export default router;
// const users = {
//     id:"",
//     name:{
//         first_name:"",
//         last_name:"",
//     },
//     gender:"",

//     address:{
//         city:"",
//         country:"",
//     },
// ...so on
// }