const KeycloakConnect = require('keycloak-connect');
const {MemoryStore} = require('express-session');
const {KeycloakClientAPI} = require('../dist/index');
const express = require('express');
const router = require('express-promise-router')();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

/* Environment variables that are passed to the server */
const KEYCLOAK_HOST = 'http://localhost:8081/auth';
const CLIENT_ID     = "some-client";
const CLIENT_SECRET = 'cLIjkrYDXjy7Hz4rB7i6p8qRJXDDiPW4';  
const REALM_NAME    = 'TEST';
const PORT          = 8082;

/* Global Keycloak Configuration */
const kc_config = {
    // 'confidential-port': 8082,
    'auth-server-url': KEYCLOAK_HOST,
    'resource': "", 
    'ssl-required': "",
    'bearer-only': true,
    realm: REALM_NAME
};


// ------------------------- Constants Section

/* Keycloak and the memory storage objects */
const memoryStore = new MemoryStore();                       
const keycloak = new KeycloakConnect({ store: memoryStore }, kc_config);
const some_cool_client = new KeycloakClientAPI.KeycloakClient(keycloak, CLIENT_ID, CLIENT_SECRET);
const app = express();

/* Testing */
const app_session = session({
    secret: "some secret",
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
});
app.use(app_session);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());


router.post('/test', async (req, res) => {
    try{
        const token = await some_cool_client.createAccessToken();
        console.log("[CREATE TOKEN]: ", token);

        await some_cool_client.createUsers([{username: "mohido", roles: []}]);
        
        const allusers = await some_cool_client.getUsers();
        console.log("[GET ALL USERS]: ", allusers);

        const specificUser = await some_cool_client.getUser("mohido");
        console.log("[GET SPECIFIC USER]: ", specificUser);

        const allRoles = await some_cool_client.getRoles();
        console.log("[GET ALL ROLES]: ", allRoles);

        await some_cool_client.updateUserRoles("mohido", ["default-roles-test"]);
        console.log("[UPDATE USER ROLES]: SUCCESS");

        await some_cool_client.deleteUser("mohido");
        console.log("[DELETE USER]: SUCCESS");
    }catch(e){
        console.log(e);
    }
    res.status(200).send({message: "Tests Passed"});
});



app.use(router);
app.listen(PORT, console.log("Testing Server started on port " + PORT));