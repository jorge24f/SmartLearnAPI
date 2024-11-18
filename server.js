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

/* sign up */
app.post('/signUp', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        //conectarse a la db
        const database = cliente.db('SmartLearn');
        //seleccionar la coleccion
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

/* login */
app.post('/login', async (req, res) => {
    try {
        const cliente = new MongoClient(uri);
        // Conectarse a la base de datos
        const database = cliente.db('SmartLearn');
        //seleccionar la coleccion
        const collection = database.collection('Users');
        // Buscar el usuario en la base de datos
        const user = await collection.findOne({
            mail: req.body.mail,
            password: req.body.password
        });

        if (user) {
            // Usuario encontrado
            console.log("Login exitoso");
            res.status(200).send({
                message: "Login exitoso",
                usuario: {
                    id: user._id,
                    mail: user.mail,
                    // Puedes devolver otros datos si los necesitas
                }
            });
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

/* Create Institution */
app.post('/CreateInstitution', async (req, res)=>{
    try{
        const cliente = new MongoClient(uri);
        //conectarse a la db
        const database = cliente.db('SmartLearn');
        //seleccionar la coleccion
        const collection = database.collection('Institutions');
        //insertar un documento
        const resultado = await collection.insertOne({
            name: req.body.name,
            address: req.body.address,
            telephone: req.body.telephone
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