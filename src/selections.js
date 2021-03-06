var drag_offset = [0, 0];
var selection_area = null;

/**
nodes: The node or selection of multiple nodes to be give the selected class
deselectCurrentSelection: if true, will remove the selected class from all currently sected nodes before selecting the new one
**/
function selectNode(nodes, deselectCurrentSelection=true){
  console.log("Nodes being selected: ");
  console.log(nodes);
  console.log(typeof nodes);

  nodes = nodes instanceof d3.selection ? nodes : d3.select(nodes);
  console.log(nodes instanceof d3.selection);
  var className = $(nodes.node()).attr("class").split(' ').filter(x=> x)[0];
  console.log(className);
  
  if( deselectCurrentSelection ){
    deselectAllObjects();
  }
  switch(className){
    case "node":
      var nodeTransform = getNodePosition(nodes);
      quickAddX = nodeTransform[0];
      quickAddY = nodeTransform[1];
      break
    case "link":
      break;
    case "map-image":
    default:
      break;
  }

  nodes.classed("selected", true);
  nodes.node().focus();
  
}

function selectNodeByDirection(direction){
  var node = d3.select(".node.selected");
  var nodePos = getNodePosition(node);
  var minAngle, maxAngle;

  switch(direction){
    case "right":
      minAngle = RIGHT_MIN_ANGLE;
      maxAngle = RIGHT_MAX_ANGLE;
      break;
    case "up":
      minAngle = UP_MIN_ANGLE;
      maxAngle = UP_MAX_ANGLE;
      break;
    case "left":
      minAngle = LEFT_MIN_ANGLE;
      maxAngle = LEFT_MAX_ANGLE;
      break;
    case "down":
      minAngle = DOWN_MIN_ANGLE;
      maxAngle = DOWN_MAX_ANGLE;
      break;
    default:
      break;
  }

  var newSelection = d3.selectAll(".node:not(.selected)")
  newSelection = newSelection.filter(function(){
      let xy = getNodePosition(this);
      let angle = Math.atan2( -1*(xy[1]-nodePos[1]), xy[0]-nodePos[0] ) / Math.PI * 180;
      return (angle >= minAngle && angle <= maxAngle)
        || (minAngle > maxAngle && (angle >= minAngle || angle <= maxAngle)) 
      })
  newSelection = newSelection[0].sort(function(a,b){
      let aPos = getNodePosition(d3.select(a));
      let bPos = getNodePosition(d3.select(b));
      let aDist = Math.sqrt(Math.pow( nodePos[0]-aPos[0] , 2) + Math.pow( nodePos[1] - aPos[1], 2));
      let bDist = Math.sqrt(Math.pow( nodePos[0]-bPos[0] , 2) + Math.pow( nodePos[1] - bPos[1], 2));
      return aDist - bDist;
    })[0];
  if(newSelection){
    selectNode(newSelection);
  }
}

function deselectAllObjects(){
  console.log("deslecting all objects");
  var allNodes = d3.selectAll(".selected");
  allNodes.classed("selected", false);
  if(!selection_area){
    d3.select(".selection_area").remove();
  }
}

function drawSelectionArea(e){
    if (!selection_area){
      //console.log("Creating Selection Area");
      d3.select(".selection_area").remove();
      selection_area = d3.select(canvas).insert("rect", ":first-child")
        .classed("selection_area", true)
        .classed("group", true)
        .attr("x", e.pageX)
        .attr("y", e.pageY)
        .attr("width", 0)
        .attr("height", 0)
      //console.log("selection is created");
    }
    var rectX = Number(selection_area.attr("x"));
    var rectY = Number(selection_area.attr("y"));
    var width = Number(selection_area.attr("width"));
    var height = Number(selection_area.attr("height"));
    var midX = rectX + width / 2;
    var midY = rectY + height / 2;

    if( e.pageX > midX ){
      selection_area.attr("width", e.pageX - rectX);
    } else{
      selection_area.attr("width", rectX - e.pageX + width);
      selection_area.attr("x", e.pageX);
    }
    if( e.pageY > midY ){
      selection_area.attr("height", e.pageY - rectY);
    } else{
      selection_area.attr("height", rectY - e.pageY + height);
      selection_area.attr("y", e.pageY);
    }
    //console.log("selection area drawn");
}

function createGroup(){
  //console.log("creating group");
  deselectAllObjects();

  var left = Number(selection_area.attr("x"));
  var right = left + Number(selection_area.attr("width"));
  var top = Number(selection_area.attr("y"));
  var bottom = top + Number(selection_area.attr("height"));

  var allNodes = d3.selectAll(".node")
  var children_ids = [];
  //console.log(grouped_nodes);
  //console.log("left: ", left, ", right: ", right, ", top: ", top, ", bottom: ", bottom);
  var grouped_nodes = allNodes.filter( function() {
    var position = getNodePosition(this);
    var x = position[0];
    var y = position[1];
    //console.log("x: ", x, ", y: ", y);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
  //console.log(grouped_nodes)
  grouped_nodes.each(function(){children_ids.push(d3.select(this).attr("id"))});
  if(grouped_nodes.size() > 0){
    selectNode(grouped_nodes);
  }
  selection_area.attr("children_ids", children_ids.join(" "));

  selection_area = null;
  dragged_object = null;
  console.log('creating the group')
}

function moveGroup(group, x, y){
  var group = d3.select(group);
  var nodeIds = group.attr("children_ids").split(" ").filter(x => x);

  var xMove = x - group.attr("x") + drag_offset[0];
  var yMove = y - group.attr("y") + drag_offset[1];

  for(i = 0; i < nodeIds.length; i++){
    let nodeId = nodeIds[i];
    var node = d3.select('#'+ nodeId);
    translateNode(node.node(), xMove, yMove, true);
  }

  group.attr("x", x + drag_offset[0]);
  group.attr("y", y + drag_offset[1]);
}

function addNodeToGroup(node, group){
  let new_children_ids = String(group.getAttribute("children_ids"))
    .split(" ")
    .filter(x => x);
  new_children_ids.push(node.id);
  new_children_ids = new_children_ids.join(' ');
  group.setAttribute("children_ids", new_children_ids);
}

/*
 *@param group - the group or image whose children wil be selected
 */
function getGroupedNodes(group){
   var nodes = [];
   var nodeIds = group.getAttribute("children_ids").split(" ").filter(x => x);
   for(var i=0; i < nodeIds.length; i++){111
      nodes.push(document.getElementById(nodeIds[i]));
   }
   console.log("Grouped Nodes: " + nodes );
   return d3.selectAll(nodes);
}

function BBIsInGroup(nodeBB, group){
  var left = parseInt(group.getAttribute("x"));
  var top = parseInt(group.getAttribute("y"));
  var right = left + parseInt(group.getAttribute("width"));
  var bottom = top + parseInt(group.getAttribute("height"));
  return nodeBB.left >= left &&
    nodeBB.right <= right &&
    nodeBB.top >= top &&
    nodeBB.bottom <= bottom
}