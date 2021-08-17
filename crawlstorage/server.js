const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const url = "https://lacerta-2021.uc.r.appspot.com/"
const projectId = 'Lacerta-2021';
const datastore = new Datastore();

const CRAWL = "Crawl";

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
  item.id = item[Datastore.KEY].id;
  return item;
}

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ------------- Begin Crawl Model Functions ------------- */
async function get_crawl(crawl_id){
	const key = datastore.key([CRAWL, crawl_id]);
  let crawl = null;
  await datastore.get(key).then( results => {
    crawl = results[0];
  });
  if (crawl == null) {
    var e = new Error;
    e.name = "InvalidCrawlIdError";
    throw e;
  }
  return crawl;
}

function post_crawl(url, type, depth, keyword){
  var id = uuid4();
  var key = datastore.key([CRAWL, id]);
  const crawl = {
    "id": id,
    "url": url,
    "type": type,
    "depth": depth,
    "keyword": keyword
  };
	return datastore.save({"key":key, "data":crawl}).then(() => {return key});
}

/* ------------- End Crawl Model Functions ------------- */

/* ------------- Begin Crawl Controller Functions ------------- */
router.get('/crawls', function(req, res) {
  console.log("Viewing all crawls");
  const query = datastore.createQuery(CRAWL);

  datastore.runQuery(query, function(err, entities) {
    if (err) {
      res.status(500).send({ error:"unknown get cargo error"});
    }
    if (req.accepts('json')) {
      res.set("Content", "application/json");
      res.status(200).json(entities);
    } else {
      res.status(406).send({ error:"invalid content request"})
    }
  });
});

router.get('/crawls/:crawl_id', function(req, res) {
  console.log("Viewing crawl " + req.params.crawl_id);
  return get_crawl(req.params.crawl_id)
  .then(crawl => {
    console.log(crawl);
    res.set("Content", "application/json");
    res.set("Access-Control-Allow-Origin", "*")
    res.status(200).json(crawl);
  }).catch(function(error) {
    if (error.name == 'InvalidCrawlIdError') {
      res.status(404).send({ error:"no crawl found with this id"});
    } else {
      console.log(error);
      res.status(500).send({ error:"unknown get crawl error"});
    }
  });
});

router.post('/crawls', function(req, res){
  console.log(req.body);
  post_crawl(req.body.url, req.body.type, req.body.depth, req.body.keyword)
  .then( key => {res.status(201).send('{ "id": \"' + key.name + '\", "url": \"' + req.body.url + '\" }')} );
});

router.put('/crawls', function(req, res){
  console.log("Modifying crawl root");
  res.status(405).send('modifying crawls root not allowed');
});

router.delete('/crawls', function(req, res){
  console.log("Deleting crawl root");
  res.status(405).send('deleting crawls root not allowed');
});
/* ------------- End Crawl Controller Functions ------------- */

app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
