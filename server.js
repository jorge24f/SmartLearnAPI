const express = require('express');

const bodyParser = require('body-parser');
var urlEncodeParser = bodyParser.urlencoded({extended:true});

const path = require('path');

//const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

let port = 3001;

const uri = 'mongodb+srv://jflg24:YX1gkFQQab8yWq0u@claseux.zciih6l.mongodb.net/?retryWrites=true&w=majority&appName=ClaseUX';

const app = express(); // Inicializando express

app.use(urlEncodeParser);

//app.use(cors());

//app.options('*', cors());

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


/*sign up*/
app.post('/signUp', async (req, res)=>{

    try{
        const cliente = new MongoClient(uri);
        //conectarse a la db
        const database = cliente.db('ClaseEmergentes');
        //seleccionar la coleccion
        const collection = database.collection('Usuarios');
        //insertar un documento
        const resultado = await collection.insertOne({
            usuario: req.body.usuario,
            contrasena: req.body.contrasena,
            //firebaseid: firebaseResult.user.id,
            ...req.body
        });
        console.log(resultado);
        console.log('Usuario creado con exito');
        res.status(200).send({
            message: "Usuario creado con exito", 
            resultado: resultado
        });
    }catch(error){
        console.log("No se pudo crear el usuario", error);
        res.status(500).send({
            message: "No se pudo crear el usuario"+error
        });
    }
    
    // res.status(200).send({s
    //     message: 'Usuario creado con exito'
    // });
});


/* login */
app.post('/login', async (req, res) => {
    try {
        const cliente = new MongoClient(uri);

        // Conectarse a la base de datos
        const database = cliente.db('ClaseEmergentes');
        const collection = database.collection('Usuarios');

        // Buscar el usuario en la base de datos
        const usuario = await collection.findOne({
            usuario: req.body.usuario,
            contrasena: req.body.contrasena
        });

        if (usuario) {
            // Usuario encontrado
            console.log("Login exitoso");
            res.status(200).send({
                message: "Login exitoso",
                usuario: {
                    id: usuario._id,
                    usuario: usuario.usuario,
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