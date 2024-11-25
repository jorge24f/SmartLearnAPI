const express = require('express');

const bodyParser = require('body-parser');
var urlEncodeParser = bodyParser.urlencoded({extended:true});

const path = require('path');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');

let port = 3001;

const uri = 'mongodb+srv://jflg24:YX1gkFQQab8yWq0u@claseux.zciih6l.mongodb.net/?retryWrites=true&w=majority&appName=ClaseUX';

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

/* signUp */
app.post('/signUp', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
     
        const database = cliente.db('SmartLearn');
       
        const collection = database.collection('Users');

        const collection2 = database.collection("Institutions");

        // Validar que el mail y username sean unicos
        // Validar que el institutionID exista

        const verifyMail = await collection.findOne({
            mail: req.body.mail
        });

        const verifyUserName = await collection.findOne({
            userName: req.body.userName
        });

        const verifyInstitutionID = await collection2.findOne({
            _id: new ObjectId(req.body.institutionID)
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
                password: req.body.password,
                institutionID: new ObjectId(req.body.institutionID),
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
        console.log(req.body.userName)
        console.log(req.body.password)
        const user = await collection.findOne({
            userName: req.body.userName,
            password: req.body.password
        });
        
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
        console.log(resultado);
        console.log('Modulo creado con exito!');
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
        console.log(resultado);
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