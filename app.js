//Exportación de librerias necesarias
import express, { request, response } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import {v4 as uuidv4} from 'uuid';

const app = express();
const PORT = 3500;

app.listen(PORT,()=>{
    console.log(`Servidor iniciado en http://localhost: ${PORT}`)
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));

//Sesiones almacemadas en Memoria(RAM)
const sessions = {};
app.use(
    session({
        secret: "P4-DBG#DulceBal-SesionesHTTP-VariablesDeSesion",
        resave: false,
        saveUninitialized: false,
        cookie: {maxAge: 5 * 60 * 1000}
    })
)
app.get('/',(request,response)=>{
    return response.status(200).json({message: "Bienvenid@ al API de Control de sesiones",author:"Dulce Balderas Gomez."})
})

//funcion de utilidad que nos permitira acceder a la información de la interfaz de red
const getLocalIP= () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces){
        const interfaces = networkInterfaces[interfaceName];
        for(const iface of interfaces){
            //IPv4 u no interna (no localhost)
            if (iface.family === "IPv4" && !iface.internal){
                return iface.address;
            }
        }
    }
    return null;
};


app.post('/login', (request,response)=>{
    const{email,nickname,macAddress}=request.body;
    if(!email || !nickname || !macAddress){
        return response.status(400).json({message: "Se espéran campos requeridos"})
    }
    const sessionId = uuidv4();
    const now = new Date();
    session[sessionId] ={
        sessionId,
        email,
        nickname,
        macAddress,
        ip: getLocalIP(),
        createAt: now,
        lastAccesed: now
    };
    response.status(200).json({
        message: "Se ha ingresado de manera exitosa",
        sessionId,
    });

});
app.post('/logout',(request,response) =>{
    const {sessionId} =request.body;
    if(!sessionId || !sessions[sessionId]){
       return response.status(404).json({message: "No se ha encontrado una sesion activa"});
    }
    delete sessions[sessionId];
    request.session.destroy((err)=>{
        if(err){
            return response.status(500).send('Error al cerrar sesion')
        }
    })
    response.status(200).json({message: "logout successful"});
});
app.post('/update',(request,response)=>{
    const {sessionId , email, nickname} = request.body;
    if (!sessionId || !sessions[sessionId]){
        return response.status(404).json({message: "No existe una sesión activa"})
    }
    if(email) sessions[sessionId].email = email;
    if (nickname) sessions[sessionId].nickname = nickname;
    IdleDeadline()
    sessions[sessionId].lastAccesed= newDate();
});
app.get('/status', (request,response)=>{
    const sessionId = request.query.sessionId;
    if(!sessionId || !sessions[sessionId]){
        response.status(404).json({message: "No hay sesiones activas"
    })}
    response.status(200).jsom({
        message: "Sesion Activa",
        session: sessions[sessionId]
    })
})