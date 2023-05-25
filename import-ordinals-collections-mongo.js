import mongoose from 'mongoose';
import { opendirSync, readFileSync } from "fs";

mongoose.set('strictQuery', true);

const collectionInscriptionSchema = mongoose.Schema({
	inscription_id: String,
	inscription_name: String,
	collecton_slug: String,
	collecton_name: String,
	collecton_id: String,
	attributes: Array
});

const collectionMetaSchema = mongoose.Schema({
	name: String,
	inscription_icon: String,
	supply: Number,
	slug: String,
	description: String,
	twitter_link: String,
	discord_link: String,
	website_link: String
});

const CollectionInscription = mongoose.model("collectionsInscriptions", collectionInscriptionSchema);
const CollectionMeta = mongoose.model("collectionsMeta", collectionMetaSchema);
const collectionsDir = process.argv[2] ? process.argv[2] : "."

const dir = opendirSync(collectionsDir)

const collectionInscriptions = []
const collectionMetas = []

let collectionCounter = 0
let collectionDir

for await (const entry of dir) {
	collectionCounter++
    console.log("Found collection folder: ", entry.name);
    collectionDir = opendirSync(collectionsDir + "/" + entry.name);
    
    let metaData = readFileSync(collectionDir.path + "/meta.json", {encoding:'utf8'});
    let inscriptionsData = readFileSync(collectionDir.path + "/inscriptions.json", {encoding:'utf8'});
    
    let meta = JSON.parse(metaData)
    let inscriptions = JSON.parse(inscriptionsData)
    meta.inscriptions = inscriptions
    collectionMetas.push(meta)
    collectionDir.close()
}

console.log("Total Collections:", collectionCounter)

mongoose
	.connect("mongodb://localhost:27017/ordinals-collections", { useNewUrlParser: true })
	.then(async () => {
		console.log("Connected to ordinals-collections db")
		
		for (let i = 0; i < collectionMetas.length; i++) {
			
			const inscriptionArray = collectionMetas[i].inscriptions
			delete collectionMetas[i]["inscriptions"]

			let inscriptionsObjArray = []
			let inscriptionsObj = {}
			inscriptionsObj.collecton_slug = collectionMetas[i].slug
			inscriptionsObj.collecton_name = collectionMetas[i].name

			for await (const inscription of inscriptionArray) {
      	inscriptionsObj.inscription_id = inscription.id
      	inscriptionsObj.inscription_name = inscription.meta.name
      	inscriptionsObj.attributes = inscription.meta.attributes ? inscription.meta.attributes : null
      	inscriptionsObjArray.push(structuredClone(inscriptionsObj))
 			}

 			CollectionInscription
				.insertMany(inscriptionsObjArray)
				.then(function(){
				   console.log("Inscription inserted for collection:", collectionMetas[i].slug, inscriptionsObjArray.length, i)  // Success
				}).catch(function(error){
				   console.log(error)  // Failure
				})

		}

		CollectionMeta
			.insertMany(collectionMetas)
			.then(function(){
			   console.log("Collection Data inserted", collectionMetas.length)  // Success
			}).catch(function(error){
			   console.log(error)  // Failure
			})

	})

