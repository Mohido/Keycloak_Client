# Keycloak-Client
**Keycloak-Client** is an npm package responsible to handle the communication to a `keycloak` authentication server through one of the realm's clients. In any project, the developer can define 1+ clients, and use them to alter the realm or view some related data. Note: A `client` in keycloak terminology refers to an application representation inside the realm. 

# How to Build:
Building the source code to produce the package is quite straight forward: 
* first make sure to have `node` and `npm` installed on your machine.
* on the root directory of the project, type the following commands in the terminal: `npm install`, then `npm run build`.
* the latter command will produce a new directory called `dist/` which encapsulates all the transpiled code (from typescript to javascript).
* the `dist/` folder can be coppied and used anywhere (It is a javascript module after all).


# How to Use:
* First of all the package module must be integrated to the desired project. This can be done in two ways:
  * 1) The developer may build the package from the source code, then copy the output folder (`dist/`) or its modules to their projects.
  * 2) The developer download the package from the *npm registry* through the following command: `npm install keycloak-client`, or by adding the `keycloak-client` to the `package.json` file in their project (don't forget to run `npm install` afterwards ;)).
* After a successfull merging of the package modules, the developer may use the package directly as shown in the `tests/test1.js` file. The file encapsulates a simple use case of the *KeycloakClient` object. 
* To initialize a `KeycloakClient` object, the developer must first create a keycloak connection object through the *keycloak-connect* package as shown in the code:

```
const KeycloakConnect = require('keycloak-connect');
const {MemoryStore} = require('express-session');
const {KeycloakClientAPI} = require('../dist/index');

const kc_config = {
    'confidential-port': <keycloak service port>,
    'auth-server-url': <keycloak host address>,
    'resource': "", 
    'ssl-required': "",
    'bearer-only': true,
    realm: <the realm of which a connection will be created to>
};

const memoryStore = new MemoryStore();                       
const keycloak = new KeycloakConnect({ store: memoryStore }, kc_config);
```
* The previous code illustrates the creation of a `KeycloakConnect` object to a keycloak server. After connecting successfully to a keycloak server, the developer may use the `KeycloakClient` class to create a client object. The `KeycloakClient` is defined in a `KeycloakClientAPI` namespace, thus, can be written as follows:
```
const some_cool_client = new KeycloakClientAPI.KeycloakClient(keycloak, <Client name as in the keycloak server>, <the client secret>);
```

# Requirements
1) Make sure the given client has *direct access* mode enabled (can be done through the keycloak UI).
2) Some functionalities (e.g: `KeycloakClient.getUsers()`) depend on the roles assigned to the client. Therefore, the client must have a valid role to view the users in keycloak. Since this package is a lightweight package, it does not bother to check for client missconfigurations.
