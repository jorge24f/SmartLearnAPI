const express = require('express');

const bodyParser = require('body-parser');
var urlEncodeParser = bodyParser.urlencoded({extended:true});

const path = require('path');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');

const {initializeApp} = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');

let port = 3001;

const uri = 'mongodb+srv://jflg24:YX1gkFQQab8yWq0u@claseux.zciih6l.mongodb.net/?retryWrites=true&w=majority&appName=ClaseUX';

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyC0YA4HL1Cfi80UYG3Nr7-qtbHE5uvEn6s");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//Conexión Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBdz_1QpXyhYzwhoKp58kO-OA0K14G6Vpo",
    authDomain: "smartlearn-3480c.firebaseapp.com",
    projectId: "smartlearn-3480c",
    storageBucket: "smartlearn-3480c.firebasestorage.app",
    messagingSenderId: "1057644236322",
    appId: "1:1057644236322:web:e0d7b1882ce9c8d511c47b",
    measurementId: "G-1QW5M5W3JR"
  };

const app = express(); 

app.use(urlEncodeParser);

app.use(cors());

app.options('*', cors());

const client = new MongoClient(uri, {
    serverApi:{
        version:ServerApiVersion.v1,
        strict:true
    }
}); 

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fileParser = require("express-multipart-file-parser");
const { Readable } = require("stream");
const { error } = require('console');

const serviceAccount = require(path.join(__dirname, 'firebase-credentials.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'smartlearn-3480c.appspot.com' 
});

app.use(fileParser);

async function run(){
    try{
        await client.connect();
        console.log('Conectado a la base de datos');
    }catch(error){
        console.log('Hubo un error al conectarse a la base de datos', error);
    }
}

app.listen(port, () => {
    console.log("Servidor corriendo en el puerto", port)
    run();
}); 

// upload files
app.post('/upload', async (req, res) => {
    try {
        const storage = admin.storage().bucket("smartlearn-3480c.firebasestorage.app");
        const file = req.files[0];

        if (!file) {
            console.log("No file uploaded.");
            return res.status(400).send("No file uploaded.");
        }

        const fileStream = Readable.from(file.buffer);
        const fileUpload = storage.file(file.originalname);

        const writeStream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        fileStream
            .pipe(writeStream)
            .on("error", error => {
                console.log("Error:", error);
                res.status(500).send({ message: error.message });
            })
            .on("finish", async () => {
                try {
                    await fileUpload.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${storage.name}/${fileUpload.name}`;
                    console.log("File upload complete");

                    try {
                        const cliente = new MongoClient(uri);
                        const database = cliente.db('SmartLearn');
                        const collection = database.collection('Resources');
                        const resultado = await collection.insertOne({
                            url: publicUrl,
                            module_id: new ObjectId(req.body.module_id)
                        });
                        console.log(resultado);
                        console.log("Recurso creado con exito.");
                    } catch (error) {
                        console.log("No se puedo crear el recurso", error);  
                    }
                    
                    res.status(200).send({ fileUrl: publicUrl });
                } catch (error) {
                    console.log("Error making file public:", error);
                    res.status(500).send({ message: error.message });
                }
            });
    } catch (error) {
        console.log("Error:", error);
        res.status(500).send({ message: error.message });
    }
});

// signUp with firebase
app.post('/signUpFirebase', async (req,res)=>{
    const auth = getAuth(firebaseApp);
    const email = req.body.email;
    const password = req.body.password;
    try{
        const userCredential = await createUserWithEmailAndPassword(auth,email,password);
        res.status(200).send({ 
            descripcion: 'Usuario creado con exito',
            resultado: userCredential
        });
    }catch(error){
        console.log('Hubo un error al crear el usuario',error);
        res.status(500).send({ 
            descripcion: 'No se pudo crear el usuario en firebase',
            resultado: error
        });
    }
});

// login with firebase
app.post('/logInFirebase',async (req,res)=>{
    const auth = getAuth(firebaseApp); 
    const email = req.body.mail; 
    const password = req.body.password; 
    try{
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        res.status(200).send({
            descripcion: 'Sesion iniciada con exito',
            resultado: userCredential
        });
    }catch(error){
        res.status(500).send({
            descripcion: 'No se pudo iniciar sesion',
            resultado: error
        });
    }
});

// logOut with firebase
app.post('/logOutFirebase',async (req,res)=>{
    const auth = getAuth(firebaseApp);
    try{
        await signOut(auth);
        res.status(200).send({
            descripcion: 'Sesion cerrada con exito'
        });
    }catch(error){
        res.status(500).send({
            descripcion: 'No se pudo cerrar sesion',
            resultado: error
        });
    }
});

/* signUp */
app.post('/signUp', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
     
        const database = cliente.db('SmartLearn');
       
        const collection = database.collection('Users');

        const collection2 = database.collection("Institution");

        // Validar que el mail y username sean unicos
        // Validar que el institutionID exista

        const verifyMail = await collection.findOne({
            mail: req.body.mail
        });

        const verifyUserName = await collection.findOne({
            userName: req.body.userName
        });

        const verifyInstitutionID = await collection2.findOne({
            _id: req.body.institutionID
        });

        if(verifyMail){
            console.log("Este correo ya esta asociado a una cuenta!");
            res.status(401).send({
                message: "Correo invalido"
            });
        } else if(verifyUserName){
            console.log("Este nombre de usuario ya esta asociado a una cuenta!");
            res.status(401).send({
                message: "UserName invalido"
            });
        } else if(!verifyInstitutionID){
            console.log("ID de Institucion invalido!");
            res.status(401).send({
                message: "IdInstitucion invalido"
            });
        } else{
            //insertar un documento
            const resultado = await collection.insertOne({
                name: req.body.name,
                lastName: req.body.lastName,
                userName: req.body.userName,
                mail: req.body.mail,
                //password: req.body.password,
                institutionID: req.body.institutionID,
                role: req.body.role,
                registerDate: new Date()
            });
            console.log(resultado);
            console.log('Usuario creado con exito');
            res.status(200).send({
                message: "Usuario creado con exito", 
                resultado: resultado
            });
        }
    }catch(error){
        console.log("No se pudo crear el usuario", error);
        res.status(500).send({
            message: "No se pudo crear el usuario"+error
        });
    }
});

/* logIn */
app.post('/login', async (req, res) => {
    try {
        const cliente = new MongoClient(uri);
        // Conectarse a la base de datos
        const database = cliente.db('SmartLearn');
        //seleccionar la coleccion
        const collection = database.collection('Users');
        const institutions = database.collection('Institution');
        const courses = database.collection('Courses')
        // Buscar el usuario en la base de datos
        //console.log(req.body.userName)
        //console.log(req.body.password)
        const user = await collection.findOne({
            mail: req.body.mail
        });
        console.log(user);
        if (user) {
            // Usuario encontrado
            const institution = await institutions.findOne({
                _id: user.institutionID
            })
            if(user.role == 'Docente'){
                //getting assigned courses
                const assignedCourses = database.collection("Assigned_Courses")
                const assigned = await assignedCourses.find({
                    user_id: user._id
                    
                }).toArray()
                console.log(assigned)
                const courseIds = assigned.map((assignment) => assignment.course_id);
                console.log(courseIds)
                const coursesAssigned = await courses.find({ _id: { $in: courseIds } }).toArray();
                console.log(coursesAssigned)

                const updatedCourses = await Promise.all(coursesAssigned.map(async (course) => {
                    const user = await collection.findOne({ _id: course.user_id });
                    return {
                        ...course,
                        user_name: user.userName
                    };
                }));
                console.log(updatedCourses)
                //sending
                res.status(200).send({
                    message: "Login exitoso",
                    user: user,
                    institution: institution,
                    courses: updatedCourses
                });
            }else{
                //getting created courses
                const createdCourses = await courses.find({
                    user_id: user._id
                }).toArray()
                console.log(createdCourses)
                const updatedCourses = createdCourses.map((course) => {
 
                    return {
                        ...course,
                        user_name: user.userName
                    };
                })
                console.log(updatedCourses)
                //sending
                res.status(200).send({
                    message: "Login exitoso",
                    user: user,
                    institution: institution,
                    courses: updatedCourses,
                });
            }
        } else {
            // Usuario no encontrado
            console.log("Credenciales inválidas");
            res.status(401).send({
                message: "Usuario o contraseña incorrectos"
            });
        }

    } catch (error) {
        console.log("Error en el login", error);
        res.status(500).send({
            message: "Error en el login: " + error
        });
    }
});

/* createInstitution */
app.post('/CreateInstitution', async (req, res)=>{s
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Institutions');
        
        const resultado = await collection.insertOne({
            id: req.body.id,
            name: req.body.name,
            address: req.body.address,
            telephone: req.body.telephone,
            city: req.body.city,
            country: req.body.country
            
        });
        console.log(resultado);
        console.log('Institucion creada con exito');
        res.status(200).send({
            message: "Institucion creado con exito", 
            resultado: resultado
        });
    }catch(error){
        console.log("No se pudo crear la institucion", error);
        res.status(500).send({
            message: "No se pudo crear la institucion"+error
        });
    }
});

/* createCourse */
app.post('/createCourse', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);

        const database = cliente.db('SmartLearn');

        const collection = database.collection('Courses');

        const resultado = await collection.insertOne({
            institutionID: new ObjectId(req.body.institutionID),
            user_id: new ObjectId(req.body.user_id),
            name: req.body.name,
            description: req.body.description,
            creationDate: new Date()
        });
        console.log(resultado);
        console.log('Curso creado con exito');
        res.status(200).send({
            message: "Curso creado con exito", 
            resultado: resultado
        });    
    }catch(error){
        console.log("No se pudo crear el curso", error);
        res.status(500).send({
            message: "No se pudo crear el curso"+error
        });
    }
});

/* getCursosCreados */ 
app.get('/getCursosCreados', async (req,res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Courses');

        const findResult = await collection.find({
            user_id: new ObjectId(req.query.user_id)
        }).toArray();

        if(findResult.length > 0){
            console.log(findResult);
            res.status(200).send({
                message: 'Informacion obtenida con exito',
                resultado: findResult
            });
        } else{
            console.log('No se encontraron cursos para este usuario');
            res.status(404).send({
                message: 'No se encontraron cursos para este usuario',
                resultado: []
            });
        }
    }catch(error){
        console.log('Ocurrio un error', error);
        res.status(500).send({
            message: "algo salio mal",
            resultado: []
        });
    }
});

/* getCursosAsignados */ 
app.get('/getCursosAsignados', async (req,res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Assigned_Courses');

        const findResult = await collection.find({
            user_id: new ObjectId(req.query.user_id)
        }).toArray();

        if(findResult.length > 0){
            console.log(findResult);
            res.status(200).send({
                message: 'Informacion obtenida con exito',
                resultado: findResult
            });
        } else{
            console.log('No se encontraron cursos para este usuario');
            res.status(404).send({
                message: 'No se encontraron cursos para este usuario',
                resultado: []
            });
        }
    }catch(error){
        console.log('Ocurrio un error', error);
        res.status(500).send({
            message: "algo salio mal",
            resultado: []
        });
    }
});

/* assignCourse */
app.post('/assignCourse', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Assigned_Courses');

         const resultado = await collection.insertOne({
            user_id: new ObjectId(req.body.user_id),
            course_id: new ObjectId(req.body.course_id),
            completion: req.body.completion
        });
        console.log(resultado);
        console.log('Curso asignado con exito!');
        res.status(200).send({
            message: "Curso asignado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo asignar el curso!", error);
        res.status(500).send({
            message: "No se pudo asignar el curso!"+error
        });
    }
});

/*get Unit info */
app.post("/getUnits", async (req, res)=>{
    try{
        
        //getting the database
        
        const client = new MongoClient(uri);
        const database = client.db('SmartLearn');
        
        const units = database.collection('Modules');
        const courseUnits = await units.find({ course_id: new ObjectId(req.body.courseId) }).toArray();
        console.log(courseUnits)
        //sending data
        res.status(200).send({
            message: "Login exitoso",
            units: courseUnits
        });
    }catch(error){
        console.log("No se pudo conseguir las unidades")
        res.status(401).send({
            message: "Login exitoso",
        });
    }
})

app.post("/getUnitInfo", async (req, res)=>{
    try{
       
        //getting the database
        const client = new MongoClient(uri);
        const database = client.db('SmartLearn');
        
        const vocab = database.collection('Module_Vocabulary');
    
        const vocabList= await vocab.find({ module_id: new ObjectId(req.body._id) }).toArray();

        //sending data
        res.status(200).send({
            message: "vocab exitoso",
            vocabList: vocabList
        });
    }catch(error){
        console.log("No se pudo conseguir las unidades")
        console.log(error)
        res.status(401).send({
            message: "Vocab no encontrado"
        });
    }
})

app.post("/getFlashcards", async (req, res)=>{
    try{
       
        //getting the database

        const client = new MongoClient(uri);
        const database = client.db('SmartLearn');
        
        const vocab = database.collection('Flashcards');
    
        const flashcards= await vocab.find({course_id: new ObjectId(req.body.courseId) }).toArray();
        console.log(flashcards)
        //sending data
        res.status(200).send({
            message: "vocab exitoso",
            flashcards: flashcards
        });
    }catch(error){
        console.log("No se pudo conseguir las flashcards")
        console.log(error)
        res.status(401).send({
            message: "Vocab no encontrado"
        });
    }
})

/* createCompletedCourse */
app.post('/createCompletedCourse', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Completed_Courses');

         const resultado = await collection.insertOne({
            user_id: new ObjectId(req.body.user_id),
            course_id: new ObjectId(req.body.course_id)
        });
        console.log(resultado);
        console.log('Curso completado creado con exito!');
        res.status(200).send({
            message: "Curso completado creado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo asignar el curso completado!", error);
        res.status(500).send({
            message: "No se pudo asignar el curso completado!"+error
        });
    }
});

/* createModule */
app.post('/createModule', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Modules');

         const resultado = await collection.insertOne({
            course_id: new ObjectId(req.body.course_id),
            name: req.body.name
        });
       
        res.status(200).send({
            message: "Modulo creado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo crear el modulo!", error);
        res.status(500).send({
            message: "No se pudo crear el modulo"+error
        });
    }
});

/* createSummary */
app.post('/createSummary', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Summaries');

         const resultado = await collection.insertOne({
            course_id: new ObjectId(req.body.course_id),
            summary: req.body.summary
        });
        console.log('Resumen creado con exito!');
        res.status(200).send({
            message: "Resumen creado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo crear el resumen!", error);
        res.status(500).send({
            message: "No se pudo crear el resumen"+error
        });
    }
});

/* createFlashcard */
app.post('/createFlashcard', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Flashcards');

         const resultado = await collection.insertOne({
            course_id: new ObjectId(req.body.course_id),
            word: req.body.word,
            definition: req.body.definition
        });
        console.log(resultado);
        console.log('Flashcard creado con exito!');
        res.status(200).send({
            message: "Flashcard creado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo crear la flashcard!", error);
        res.status(500).send({
            message: "No se pudo crear la flashcard"+error
        });
    }
});

/* createModuleVocabulary */
app.post('/createModuleVocabulary', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Module_Vocabulary');

         const resultado = await collection.insertOne({
            module_id: new ObjectId(req.body.module_id),
            word: req.body.word,
            definition: req.body.definition
        });
        console.log(resultado);
        console.log('Module Vocabulary creado con exito!');
        res.status(200).send({
            message: "Module Vocabulary creado con exito!", 
            resultado: resultado
        });   
    }catch(error){
        console.log("No se pudo crear el Module Vocabulary!", error);
        res.status(500).send({
            message: "No se pudo crear el Module Vocabulary"+error
        });
    }
});

/* getSummaries */ 
app.get('/getSummaries', async (req,res)=>{
    try{
        
        const cliente = new MongoClient(uri);
        
        const database = cliente.db('SmartLearn');
        
        const collection = database.collection('Summaries');

        const findResult = await collection.find({
            course_id: new ObjectId(req.query.course_id)
        },{ sort: { unit_num: 1 } }).toArray();

        if(findResult.length > 0){
            console.log(findResult);
            res.status(200).send({
                message: 'Informacion obtenida con exito',
                resultado: findResult
            });
        } else{
            console.log('No se encontraron resumenes');
            res.status(404).send({
                message: 'No se encontraron resumenes',
                resultado: []
            });
        }
    }catch(error){
        console.log('Ocurrio un error', error);
        res.status(500).send({
            message: "algo salio mal",
            resultado: []
        });
    }
});

/* getCourseStudents */
app.get('/getCourseStudents', async (req, res) => {
    try {
        const cliente = new MongoClient(uri);
        const database = cliente.db('SmartLearn');
        
        const assignedCoursesCollection = database.collection('Assigned_Courses');
        const usersCollection = database.collection('Users');

        const assignedCourses = await assignedCoursesCollection.find(
            { course_id: new ObjectId(req.query.course_id) },
            { projection: { user_id: 1, completion: 1, _id: 0 } } 
        ).toArray();

        if (assignedCourses.length > 0) {

            const userIds = assignedCourses.map(course => new ObjectId(course.user_id));

            const users = await usersCollection.find(
                { _id: { $in: userIds } },
                { projection: { name: 1, lastName: 1, userName: 1 } }
            ).toArray();

            const enrichedUsers = users.map(user => {
                const courseInfo = assignedCourses.find(course => course.user_id.toString() === user._id.toString());
                return {
                    name: user.name,
                    lastName: user.lastName,
                    userName: user.userName,
                    completion: courseInfo?.completion ?? null 
                };
            });

    
            res.status(200).send({
                message: 'Información obtenida con éxito',
                resultado: enrichedUsers
            });
        } else {
            console.log('No se encontraron estudiantes para este curso');
            res.status(404).send({
                message: 'No se encontraron estudiantes para este curso',
                resultado: []
            });
        }
    } catch (error) {
        console.log('Ocurrió un error', error);
        res.status(500).send({
            message: "Algo salió mal",
            resultado: []
        });
    }
});



app.get("/getPreguntasGeneradas", async (req, res) =>{
    try{
        const name = req.query.courseName;
        const questions = req.query.questions;
        const units = req.query.units;
        console.log(name);
        console.log(questions);
        
        const prompt = "genere 5 preguntas relacionada a "+name + " "+units+" teoricas, y no me digas absolutamente nada mas excepto las preguntas, y que las respuestas sigan este formato en json: interface questions{question : string;option1 : string;option2 : string;option3 : string;option4 : string;rightAnswer : number;}, y que no se repitan estas preguntas: " + questions + " y damelo listo para aplicar JSON.parse sin ningun cambio";
        const result = await model.generateContent(prompt);
 
        const lista = result.response.text().substring(7,result.response.text().length-4);
        console.log(lista);
        res.status(200).send({
            message: "preguntas generadas exitosamente",
            list: lista
        });
    }catch(error){
        console.log('Ocurrió un error', error);
        res.status(500).send({
            message: "Algo salió mal",
            resultado: []
        });
    }
})
