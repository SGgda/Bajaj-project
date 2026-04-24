const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "https://bajaj-project-beryl.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());


const MY_ID    = "SoumadityaGhosh_16102004";     
const MY_EMAIL = "sg6922@srmist.edu.in";      
const MY_ROLL  = "RA2311003010201";        




function looksLikeEdge(str) {
  return /^[A-Z]->[A-Z]$/.test(str);
}



function scanInput(rawList) {
  const bad   = [];          
  const dupes = [];          
  const seen  = new Set();
  const good  = [];          

  for (const item of rawList) {
    const s = item.trim();

    if (!looksLikeEdge(s)) {
      bad.push(s);
      continue;
    }

    if (seen.has(s)) {
      if (!dupes.includes(s)) dupes.push(s);
      continue;
    }

    seen.add(s);
    const [from, to] = s.split("->");
    good.push([from, to]);
  }

  return { good, bad, dupes };
}



function buildMaps(edges) {
  const kidMap    = {};  
  const parentMap = {};   
  const nodePool  = new Set();

  for (const [from, to] of edges) {
    nodePool.add(from);
    nodePool.add(to);

    
    if (parentMap[to] !== undefined) continue;

    parentMap[to] = from;
    if (!kidMap[from]) kidMap[from] = [];
    kidMap[from].push(to);
  }

  return { kidMap, parentMap, nodePool };
}



function groupNodes(nodePool, kidMap, parentMap) {
  const done   = new Set();
  const groups = [];

  for (const start of nodePool) {
    if (done.has(start)) continue;

    const cluster = new Set();
    const queue   = [start];

    while (queue.length) {
      const cur = queue.shift();
      if (cluster.has(cur)) continue;
      cluster.add(cur);

      for (const kid of (kidMap[cur] || [])) {
        if (!cluster.has(kid)) queue.push(kid);
      }
      const par = parentMap[cur];
      if (par && !cluster.has(par)) queue.push(par);
    }

    for (const n of cluster) done.add(n);
    groups.push([...cluster]);
  }

  return groups;
}



function cycleExists(nodes, kidMap) {
  const state = {};
  for (const n of nodes) state[n] = "white";

  function dfs(node) {
    state[node] = "gray";
    for (const kid of (kidMap[node] || [])) {
      if (state[kid] === "gray")  return true;
      if (state[kid] === "white" && dfs(kid)) return true;
    }
    state[node] = "black";
    return false;
  }

  for (const n of nodes) {
    if (state[n] === "white" && dfs(n)) return true;
  }
  return false;
}



function nestTree(node, kidMap) {
  const obj = {};
  for (const kid of (kidMap[node] || [])) {
    obj[kid] = nestTree(kid, kidMap);
  }
  return obj;
}



function longestPath(node, kidMap) {
  const kids = kidMap[node] || [];
  if (!kids.length) return 1;
  return 1 + Math.max(...kids.map(k => longestPath(k, kidMap)));
}



app.post("/bfhl", (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "send data as an array" });
  }

  const { good, bad, dupes } = scanInput(data);
  const { kidMap, parentMap, nodePool } = buildMaps(good);
  const groups = groupNodes(nodePool, kidMap, parentMap);

  const hierarchies = [];
  let treeCnt  = 0;
  let cycleCnt = 0;
  let bigRoot  = null;
  let bigDepth = 0;

  for (const grp of groups) {
    const isCyclic = cycleExists(grp, kidMap);

    
    const roots = grp.filter(n => parentMap[n] === undefined).sort();
    const root  = roots.length ? roots[0] : [...grp].sort()[0];

    if (isCyclic) {
      cycleCnt++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      treeCnt++;
      const depth = longestPath(root, kidMap);
      const tree  = { [root]: nestTree(root, kidMap) };
      hierarchies.push({ root, tree, depth });

      if (depth > bigDepth || (depth === bigDepth && root < bigRoot)) {
        bigDepth = depth;
        bigRoot  = root;
      }
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  res.json({
    user_id:             MY_ID,
    email_id:            MY_EMAIL,
    college_roll_number: MY_ROLL,
    hierarchies,
    invalid_entries:     bad,
    duplicate_edges:     dupes,
    summary: {
      total_trees:       treeCnt,
      total_cycles:      cycleCnt,
      largest_tree_root: bigRoot,
    },
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));