const { additionner, multiplier, PI } = require("./mathematiques");


console.log("2 + 3 =", additionner(2, 3));
console.log("4 * 5 =", multiplier(4, 5));
console.log("PI =", PI);

const Utilisateur = require("./utilisateur");


const alice = new Utilisateur("Alice", "alice@mail.com");
console.log(alice.presenter());


const cheminMaths = require.resolve("./mathematiques");
console.log(" Le module mathematiques est en cache ?");
console.log("   ", cheminMaths in require.cache);

const maths1 = require("./mathematiques");
const maths2 = require("./mathematiques");
console.log("\n require() retourne le MÊME objet ?");
console.log("   maths1 === maths2 ?", maths1 === maths2);
