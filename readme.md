# Keycloak-Client
**Keycloak-Client** is an npm package responsible to handle the communication to a `keycloak` authentication server through one of the realm's clients. In any project, the developer can define 1+ clients, and use them to alter the realm or view some related data. Note: A `client` in keycloak terminology refers to an application representation inside the realm. 

# How to Build:
Building the source code to produce the package is quite straight forward: 
* first make sure to have `node` and `npm` installed on your machine.
* on the root directory of the project, type the following commands in the terminal: `npm install`, then `npm run build`.
* the latter command will produce a new directory called `dist/` which encapsulates all the transpiled code (from typescript to javascript).
* the `dist/` folder can be coppied and used anywhere (It is a javascript module after all).


# How to Use:
