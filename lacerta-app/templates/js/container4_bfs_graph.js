
function force_directed_plot(graph_start_url, graph_depth, keyword, width, height, scale, points, lines) {
    var tick_counter = 0; // Used to end the simulation without waiting for it to end on its own
    // Use depth_limit to set zoom
    var depth_limit = 1.5;
    if (graph_depth == 2) {
        depth_limit = 3;
    } else if (graph_depth == 3) {
        depth_limit = 7;
    }
    width = width * depth_limit;
    height = height * depth_limit;

    // Set viewBox
    var svg = d3.select(".crawler_graph")
            .attr("width", "95.44%")
            .attr("height", "95.44%")
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Use the points and lines arguments to make data for the graph
    // This block of code approximately adds one node for each link in the graph, even if it results
    // in redundant urls
    var visual_points = [];
    var visual_lines = [];
    var node_indexer = {};
    var point_helper = {};
    points.forEach( function(point) { point_helper[point.id] = point; });
    var k = 0;
    lines.forEach( function(link) {
        if (link.source != link.target) {
            link_string1 = link.source + link.target;
            if (node_indexer[link.source] == null) {
                node_indexer[link.source] = {"id": k, "targets": {}};
                visual_points.push({"id": k, "title": point_helper[link.source].title, 
                        "url": point_helper[link.source].id, "has_keyword": point_helper[link.source].has_keyword, "source_origin": link.source});
                k++;
            } 

            if (node_indexer[link.target] != null) {
                if (node_indexer[link.target].targets[link.source] != null && visual_points[node_indexer[link.source].id].source_origin == link.target) {
                    node_indexer[link.source].targets[link.target] = {"id": node_indexer[link.target].id};
                    visual_lines.push({"source": node_indexer[link.source].id, "target": node_indexer[link.target].id});
                } else {
                    node_indexer[link.source].targets[link.target] = {"id": k};
                    visual_points.push({"id": k, "title": point_helper[link.target].title, 
                            "url": point_helper[link.target].id, "has_keyword": point_helper[link.target].has_keyword, "source_origin": link.source});
                    k++;

                    visual_lines.push({"source": node_indexer[link.source].id, "target": node_indexer[link.source].targets[link.target].id});
                }
            } else {
                node_indexer[link.source].targets[link.target] = {"id": k};
                visual_points.push({"id": k, "title": point_helper[link.target].title, 
                        "url": point_helper[link.target].id, "has_keyword": point_helper[link.target].has_keyword, "source_origin": link.source});
                k++;

                node_indexer[link.target] = {"id": node_indexer[link.source].targets[link.target].id, "targets": {}};

                visual_lines.push({"source": node_indexer[link.source].id, "target": node_indexer[link.source].targets[link.target].id});
            }
        } 
    });

    var link_indexer = {};
    var link_string1;
    visual_lines.forEach( function(link, i) {
        link_string1 = visual_points[link.source].url + visual_points[link.target].url;
        link_indexer[link_string1] = {"id": i, "source": visual_points[link.source].id, "target": visual_points[link.target].id};   
    });

    var visual_urls_helper = {};
    var n = 0;
    visual_points.forEach( function(point) {
        if (visual_urls_helper[point.url] == null) {
            visual_urls_helper[point.url] = {"url": point.url, "ids": [], "index": n};
            visual_urls_helper[point.url].ids.push(point.id);
            n++;
        } else {
            visual_urls_helper[point.url].ids.push(point.id);
        }
    });
    var visual_urls = [];
    for (var element in visual_urls_helper) {
        visual_urls.push(visual_urls_helper[element]);
    }
   
    var node_count = visual_points.length;
    var link_count = visual_lines.length;

    // Set tick_stop and alpha_stop to determine length of time for simulation
    var tick_stop = 200;
    var alpha_stop = 0.02;
    if (graph_depth == 1) {
        tick_stop = 25;
        alpha_stop = 0.05;
    } else if (graph_depth == 2) {
        tick_stop = 165;
        alpha_stop = 0.035;
    } else if (graph_depth == 3) {
        tick_stop = 250;
        alpha_stop = 0.015;
    }

    var ideal_distance = 10;

    // This creates additional nodes that are assigned positions at the links to try to keep the nodes
    // from settling on the lines
    var graph_linknodes = [];
    var j = 0;
    visual_lines.forEach(function(link) {
        graph_linknode_index = node_count + j++;
        graph_linknodes.push({ "id": graph_linknode_index });
    });
    visual_points = visual_points.concat(graph_linknodes);
    
    // Assign nodes and links and start simulation
    var simulation_count = 1;
    var simulation_continue_flag = 0;
    var ended_flag = 0;
    var nodes = visual_points.map(d => Object.create(d));
    var links = visual_lines.map(d => Object.create(d));
    var simulation = forceSimulation(nodes, links).on("tick", ticked).on("end", check_simulation);
   
    function check_simulation() {
        if (!simulation_continue_flag) {
            simulation_continue();
        }
    }

    function check_ended() {
        if (!ended_flag) {
            ended();
        }
    }

    function forceSimulation(nodes, links) {
        return d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(d => d.id).distance(ideal_distance))
          .force("charge", d3.forceManyBody().strength(-75))
          .force("center", d3.forceCenter())
          .force("collision", d3.forceCollide().radius(10).strength(1))
          .alphaDecay([alpha_stop]);
    }

    function simulation_continue() {
        simulation_continue_flag = 1;
        simulation_count++;
        tick_stop += 125;
        ideal_distance = 110;
        if (graph_depth == 1 && points.length > 30) {
            ideal_distance = 150;
        }
        simulation.force("charge").strength(-100);
        simulation.force("link").distance(ideal_distance);
        simulation.on("end", check_ended);
        simulation.alpha(0.5).restart();
    }

    function ticked() {
        d3.selectAll(".crawler_graph g").remove();
        nodes[0].fx = 0;
        nodes[0].fy = 0;

        var link = svg.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
                .attr("class", "graph_line")
                .attr("stroke", "#717171")
                .attr("stroke-opacity", function() {
                    if (graph_depth == 3) {
                        return 0.8;
                    } else {
                        return 0.6;
                    }
                })
                .attr("stroke-width", 3)
                .attr("id", function(d) { return "graph_line" + String(d.index)});

        var node = svg.append("g")
            .selectAll("circle")
            .data(nodes.slice(0, node_count))
            .enter().append("circle")
              .attr("stroke", "#fff")
              .attr("stroke-width", 3)
              .attr("r", 10);

        var linknode = svg.append("g")
            .selectAll("circle")
            .data(nodes.slice(node_count, node_count + link_count))
            .enter().append("circle")
             .attr("class", "link_node")
              .attr("r", 8)
              .attr("fill", "#717171")
              .attr("opacity", 0.6)
              .attr("display", "none");

        link
            .attr("x1", function(d) { 
                graph_linknodes[d.index].x1 = d.source.x; 
                return d.source.x; })
            .attr("y1", function(d) { 
                graph_linknodes[d.index].y1 = d.source.y; 
                return d.source.y; })
            .attr("x2", function(d) { 
                graph_linknodes[d.index].x2 = d.target.x; 
                return d.target.x; })
            .attr("y2", function(d) { 
                graph_linknodes[d.index].y2 = d.target.y; 
                return d.target.y; });

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", color = function(d) {return scale(d.index % 10);})
            .attr("id", function(d) { return "graph_node" + String(d.index)})
            .attr("index", d => d.index)
            .attr("jump_link", d => d.url)
            .attr("has_keyword", d => d.has_keyword)
            .attr("title", d => d.title);

        linknode
            .attr("cx", function(d) {
                return (graph_linknodes[d.index - node_count].x2 -
                    graph_linknodes[d.index - node_count].x1) * ((tick_counter/4) % 9 + 1)/10 + graph_linknodes[d.index - node_count].x1; })
            .attr("cy", function(d) {
                return (graph_linknodes[d.index - node_count].y2 -
                    graph_linknodes[d.index - node_count].y1) * ((tick_counter/4) % 9 + 1)/10 + graph_linknodes[d.index - node_count].y1; });

        if (tick_counter++ > tick_stop) {
            simulation.stop()
            if (simulation_count == 1){
                simulation_continue();
            } else {
                ended();
            }
        }
    }

    function ended() {
        if (graph_depth > 1) {
            correct_overlap_one(nodes, links, node_indexer, link_indexer, graph_start_url);
        }
        ended_flag = 1;        
        defs = svg.append("defs");
        defs.append("marker")
            .attr("id", "graph_arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 19)
            .attr("refY", 0)
            .attr("markerWidth", 4.2)
            .attr("markerHeight", 4.2)
            .attr("orient", "auto")
            .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("class","graph_arrowhead");

        defs.append("marker")
        .attr("id", "graph_asterisk")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 5)
        .attr("refY", 5)
        .attr("markerWidth", 12)
        .attr("markerHeight", 12)
        .attr("orient", 0)
        .attr("fill", "white")
        .append("path")
            .attr("d", "M5,0L4,0L4,3.3L1.1,1.7L0.2,3.4L3,5L0.2,6.6L1.1,8.4L4,6.7L4,10L6,10L6,6.7L8.9,8.4L9.8,6.6L7,5L9.8,3.4L8.9,1.7L6,3.3L6,0")
            .attr("class","graph_asterisk_path");   

        d3.selectAll(".graph_line")
            .attr("marker-end", "url(#graph_arrow)");

        var stop_word = keyword;
        if (stop_word === "") {
            stop_word = "(None)";
        }
        var supplemental_list = d3.select(".graph_url_list");
        supplemental_list.append("div")
            .append("h6").text("Start URL: " + graph_start_url);
        supplemental_list.append("div")
            .append("h6").text("Crawl Type: BFS");
        supplemental_list.append("div")
            .append("h6").text("Depth: " + graph_depth);
        supplemental_list.append("div")
            .append("h6").text("Stop Word: " + stop_word);
        supplemental_list.append("div")
            .append("h6").text("Nodes:");

        d3.selectAll(".crawler_graph g .link_node").remove();
        var keyword_found = false;
        var final_nodes = d3.selectAll(".crawler_graph circle");
        final_nodes.on("mouseover", function() { 
                        circle_node_ingress(this, width, height, depth_limit, keyword);})
                    .on("mouseout", function() { circle_node_egress(this, scale);})
                    .on("click", circle_node_click)
                    .each( function() {
                        this_circle = d3.select(this);
                        if (this_circle.attr("has_keyword") == "true") {
                            if (!keyword_found) {
                                supplemental_list.append("div")
                                                .text("(Keyword Was Found)")
                                                .attr("class", "graph_url_list_title");
                                keyword_found = true;
                            }
                            this_circle_parent = d3.select(this.parentNode);
                            this_circle_parent.append("line")
                                    .attr("class", "graph_line")
                                    .attr("id", "graph_asterisk_line")
                                    .attr("x1", this_circle.attr("cx"))
                                    .attr("y1", this_circle.attr("cy"))
                                    .attr("x2", this_circle.attr("cx"))
                                    .attr("y2", this_circle.attr("cy"))
                                    .attr("marker-end", "url(#graph_asterisk)")
                                    .attr("stroke-width", 1)
                                    .attr("stroke", "white")
                        }
                    });
                
        bfs_add_supplemental_url(visual_urls, supplemental_list, scale);

         var final_lines = d3.selectAll(".crawler_graph .graph_line");

        svg.call(d3.zoom().on("zoom", function() {
        	final_nodes.attr("transform", d3.event.transform);
        	final_lines.attr("transform", d3.event.transform);
      	}));
    }
}

function correct_overlap_one(nodes, links, node_indexer, link_indexer, graph_start_url) {
    var angle_threshold = 4;
    var check_angle_flag = 0;
    var new_targets = {};
    var link_angles = [];
    var link_string1;
    var initial_angle;
    var flipped_angle;
    var add_source_flag = 1;
    links.forEach( function(link) {
        link_angles.push(calculate_link_angle(link));
    });

    var source_origin_string;
    var source_link_angles = [];
    for (source in node_indexer) {
        new_targets = node_indexer[source].targets;
        for (item in new_targets) {
            link_string1 = source + item
            source_link_angles.push({"id": new_targets[item].id, "angle": link_angles[link_indexer[link_string1].id]});
            if (!check_angle_flag && 
                Object.keys(node_indexer[item].targets).length > 0 && 
                nodes[node_indexer[item].id].source_origin == source) {
                check_angle_flag = 1;
            }
        }
        new_targets = {};
        if (source_link_angles.length > 0) {
            if (check_angle_flag) {
                if (source != graph_start_url) {
                    source_origin_string = nodes[node_indexer[source].id].source_origin;
                    source_link_angles.forEach( function(element, i) {
                        if (element.id == node_indexer[source_origin_string].id) {
                            add_source_flag = 0;
                        }
                    });
                    if (add_source_flag) {
                        link_string1 = source_origin_string + source;
                        initial_angle = link_angles[link_indexer[link_string1].id];
                        if (initial_angle == 0) {
                            flipped_angle = 180;
                        } else if (initial_angle == 180 || initial_angle == -180) {
                            flipped_angle = 0;
                        } else if (initial_angle < 0) {
                            flipped_angle = 180 + initial_angle;
                        } else {
                            flipped_angle = -180 + initial_angle;
                        }   
                        source_link_angles.push({"id": node_indexer[source_origin_string].id, "angle": flipped_angle});
                    }
                }
                source_link_angles.sort(function(a,b){return a.angle - b.angle});
                source_link_angles.forEach( function(element, i) {
                    if (i == source_link_angles.length - 1) {
                        if (Math.abs(element.angle + source_link_angles[0].angle) < angle_threshold) {
                            move_graph_one(nodes, links, node_indexer, link_indexer, element, source_link_angles[0])
                        }
                    } else {
                        if (Math.abs((element.angle - source_link_angles[i + 1].angle)) < angle_threshold) {
                            move_graph_one(nodes, links, node_indexer, link_indexer, element, source_link_angles[i + 1])
                        } 
                    }
                   
                });
            }   
        }

        add_source_flag = 1;
        check_angle_flag = 0;
        source_link_angles = [];
    }
}

function move_graph_one(nodes, links, node_indexer, link_indexer, node_one, node_two) {
    var angle_threshold = 4*Math.PI/180;
    var node_one_terminal = 0;
    var node_two_terminal = 0;
    var node_select_string;
    var link_select_string;
    var link_string1;
    var node_to_move;
    var link_to_move;
    var new_x;
    var new_y;
    var old_x1;
    var old_x2;
    var old_y1;
    var old_y2;
    var delta_theta = angle_threshold;

    if (Object.keys(node_indexer[nodes[node_one.id].url].targets).length == 0 && node_one.id != 0) {
        node_one_terminal = 1;
    } 
    if (Object.keys(node_indexer[nodes[node_two.id].url].targets).length == 0 && node_two.id != 0) {
        node_two_terminal = 1;
    } 

    if (node_one_terminal) {
        node_select_string = "#graph_node" + String(node_one.id);
        node_to_move = d3.select(node_select_string);
        link_string1 = nodes[node_one.id].source_origin + nodes[node_one.id].url;
        link_select_string = "#graph_line" + link_indexer[link_string1].id;
        link_to_move = d3.select(link_select_string);
        if (node_two.angle > node_one.angle) {
            delta_theta = -angle_threshold;
        } 
        old_x1 = Number(link_to_move.attr("x1"));
        old_y1 = Number(link_to_move.attr("y1"));
        old_x2 = Number(link_to_move.attr("x2"));
        old_y2 = Number(link_to_move.attr("y2"));
        new_x = (old_x2 - old_x1)*Math.cos(delta_theta) - (old_y2 - old_y1)*Math.sin(delta_theta) + old_x1;
        new_y = (old_x2 - old_x1)*Math.sin(delta_theta) + (old_y2 - old_y1)*Math.cos(delta_theta) + old_y1;
        node_to_move
            .attr("cx", new_x)
            .attr("cy", new_y);
        link_to_move
            .attr("x2", new_x)
            .attr("y2", new_y);
    } else if (node_two_terminal) {
        node_select_string = "#graph_node" + String(node_two.id);
        node_to_move = d3.select(node_select_string);
        link_string1 = nodes[node_two.id].source_origin + nodes[node_two.id].url;
        link_select_string = "#graph_line" + link_indexer[link_string1].id;
        link_to_move = d3.select(link_select_string);
        if (node_one.angle > node_two.angle) {
            delta_theta = -angle_threshold;
        } 
        old_x1 = Number(link_to_move.attr("x1"));
        old_y1 = Number(link_to_move.attr("y1"));
        old_x2 = Number(link_to_move.attr("x2"));
        old_y2 = Number(link_to_move.attr("y2"));
        new_x = (old_x2 - old_x1)*Math.cos(delta_theta) - (old_y2 - old_y1)*Math.sin(delta_theta) + old_x1;
        new_y = (old_x2 - old_x1)*Math.sin(delta_theta) + (old_y2 - old_y1)*Math.cos(delta_theta) + old_y1;
        node_to_move
            .attr("cx", new_x)
            .attr("cy", new_y);
        link_to_move
            .attr("x2", new_x)
            .attr("y2", new_y);
    }
}

function calculate_link_angle(link) {
    delta_y = link.target.y - link.source.y;
    if (delta_y == 0) {
        return 0;
    }
    delta_x = link.target.x - link.source.x;
    if (delta_x == 0) {
        if (delta_y < 0) {
            return -90;
        } else {
            return 90;
        }
    }
    return Math.atan2(delta_y, delta_x) * 180/Math.PI;  
}

function circle_node_ingress(input, width, height, depth_limit, keyword) {
    var this_circle = d3.select(input);
    var transform_cx = 0;
    var transform_cy = 0;
    var transform_scale = 1;
    if (this_circle.attr("transform") != null) {
        transform_cx = Number((this_circle.attr("transform").split('(')[1]).split(',')[0]);
        transform_cy = Number(((this_circle.attr("transform").split('(')[1]).split(',')[1]).split(')')[0]);
        transform_scale = Number((this_circle.attr("transform").split('(')[2]).split(')')[0]);
    }
    this_circle
        .attr("stroke", "#000000")
        .attr("stroke-width", 5)
        .attr("fill", "white")
        .attr("r", 12);
    var circle_cx = Number(this_circle.attr("cx"));
    var circle_cy = Number(this_circle.attr("cy"));
    var label_x = String((transform_scale * (circle_cx + 30) + transform_cx + width/2)/depth_limit) + "px";
    var label_y = String((transform_scale * (circle_cy - 90) + transform_cy + height/2)/depth_limit) + "px";
    var overall_container = d3.select("#container4");
    var hover_text = "";
    if (this_circle.attr("index") == 0) {
        hover_text += "<b><i>Start URL</i></b><br/>";
    }
    if (this_circle.attr("has_keyword") == "true") {
        hover_text += "<b><i>Has Keyword: </b>" + keyword + "</i><br/>";
    }
    hover_text += "<b>Title: </b>" + this_circle.attr("title") + "<br/>" + "<b>URL: </b>" + this_circle.attr("jump_link");
    overall_container.append("div")
                        .html(hover_text)
                        .attr("id", "graph_node_label");
    var new_node_label = document.getElementById("graph_node_label");
    new_node_label.style.left = label_x;
    new_node_label.style.top = label_y;
}

function circle_node_egress(input, scale) {
    color = scale(Number(input.id.slice(10)) % 10);
    d3.select(input)
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("fill", color)
        .attr("r", 10);
    d3.selectAll("#container4 #graph_node_label").remove();
}

function circle_node_click() {
    this_circle = d3.select(this);
    var url_link = this_circle.attr("jump_link");
    window.open(url_link, "_blank");
}

function bfs_add_supplemental_url(visual_urls, url_list, scale) {
    var url_id;
    var select_string;
    var hover_text;
    visual_urls.forEach( function(url) {
        var these_circles = []
        url.ids.forEach( function(id) {
            select_string = "#graph_node" + id            
            these_circles.push(d3.select(select_string));
        });

        hover_text = "";
        if (url.index == 0) {
            hover_text += "<i>(Start URL)</i> ";
        }
        if (these_circles[0].attr("has_keyword") == "true") {
            hover_text += "<i>(Has Keyword)</i> ";
        }
        hover_text += these_circles[0].attr("jump_link");

        url_list.append("li")
            .html(hover_text)
            .attr("class", "graph_url_list_item")
            .on("mouseover", function() { bfs_url_list_ingress(this, these_circles);})
            .on("mouseout", function() { bfs_url_list_egress(this, these_circles, scale);})
            .on("click", function() { bfs_url_list_click(this, url.url);});

    });
    
}

function bfs_url_list_ingress(list_input, circle_input) {
    list_input.style.color = "blue";
    list_input.style.textDecoration = "underline";

    circle_input.forEach( function(circle) {
        circle
        .attr("stroke", "#000000")
        .attr("stroke-width", 5)
        .attr("fill", "white")
        .attr("r", 12);
    });
    
}

function bfs_url_list_egress(list_input, circle_input, scale) {
    list_input.style.color = "black";
    list_input.style.textDecoration = "none";

    var color;
    circle_input.forEach( function(circle) {
        color = scale(circle.attr("index") % 10);
        circle
            .attr("stroke", "#fff")
            .attr("stroke-width", 3)
            .attr("fill", color)
            .attr("r", 10);
    });
    
}

function bfs_url_list_click(list_input, jump_link) {
    window.open(jump_link, "_blank");
}

function force_directed_plot_one(graph_start_url, graph_depth, keyword, width, height, scale, points) {
    var depth_limit = 1;
    width = width * depth_limit;
    height = height * depth_limit;

    var svg = d3.select(".crawler_graph")
            .attr("width", "95.44%")
            .attr("height", "95.44%")
            .attr("viewBox", [-width / 2, -height / 2, width, height]);
   
    const nodes = points.map(d => Object.create(d));
   
    d3.selectAll(".crawler_graph g").remove();

    var node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
          .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .attr("r", 10);

    node
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("fill", color = function(d) {return scale(0 % 10);})
        .attr("id", function(d) { return "graph_node" + String(0)})
        .attr("index", 0)
        .attr("jump_link", d => d.id)
        .attr("has_keyword", d => d.has_keyword)
        .attr("title", d => d.title);

    defs = svg.append("defs");

    defs.append("marker")
    .attr("id", "graph_asterisk")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 5)
    .attr("refY", 5)
    .attr("markerWidth", 12)
    .attr("markerHeight", 12)
    .attr("orient", 0)
    .attr("fill", "white")
    .append("path")
        .attr("d", "M5,0L4,0L4,3.3L1.1,1.7L0.2,3.4L3,5L0.2,6.6L1.1,8.4L4,6.7L4,10L6,10L6,6.7L8.9,8.4L9.8,6.6L7,5L9.8,3.4L8.9,1.7L6,3.3L6,0")
        .attr("class","graph_asterisk_path");   

    var stop_word = keyword;
    if (stop_word === "") {
        stop_word = "(None)";
    }
    var supplemental_list = d3.select(".graph_url_list");
    supplemental_list.append("div")
        .append("h6").text("Start URL: " + graph_start_url);
    supplemental_list.append("div")
        .append("h6").text("Crawl Type: BFS");
    supplemental_list.append("div")
        .append("h6").text("Depth: " + graph_depth);
    supplemental_list.append("div")
        .append("h6").text("Stop Word: " + stop_word);
    supplemental_list.append("div")
        .append("h6").text("Nodes: ");

    d3.selectAll(".crawler_graph g .link_node").remove();
    var keyword_found = false;
    var final_nodes = d3.selectAll(".crawler_graph circle");
    final_nodes.on("mouseover", function() { 
                    circle_node_ingress(this, width, height, depth_limit, keyword);})
                .on("mouseout", function() { circle_node_egress(this, scale);})
                .on("click", circle_node_click)
                .each( function() {
                    this_circle = d3.select(this);
                    if (this_circle.attr("has_keyword") == "true") {
                        if (!keyword_found) {
                            supplemental_list.append("div")
                                            .text("(Keyword Was Found)")
                                            .attr("class", "graph_url_list_title");
                            keyword_found = true;
                        }
                        this_circle_parent = d3.select(this.parentNode);
                        this_circle_parent.append("line")
                                .attr("class", "graph_line")
                                .attr("id", "graph_asterisk_line")
                                .attr("x1", this_circle.attr("cx"))
                                .attr("y1", this_circle.attr("cy"))
                                .attr("x2", this_circle.attr("cx"))
                                .attr("y2", this_circle.attr("cy"))
                                .attr("marker-end", "url(#graph_asterisk)")
                                .attr("stroke-width", 1)
                                .attr("stroke", "white")
                    }
                })
                .each( function() {
                    bfs_add_supplemental_url_one(this, supplemental_list, scale);
                });

    var final_lines = d3.selectAll(".crawler_graph .graph_line");

    svg.call(d3.zoom().on("zoom", function() {
        final_nodes.attr("transform", d3.event.transform);
        final_lines.attr("transform", d3.event.transform);
    }));
}

function bfs_add_supplemental_url_one(input, url_list, scale) {
    var this_circle = d3.select(input);
    var hover_text = "";
    if (Number(this_circle.attr("id").slice(10)) == 0) {
        hover_text += "<i>(Start Website)</i> ";
    }
    if (this_circle.attr("has_keyword") == "true") {
        hover_text += "<i>(Has Keyword)</i> ";
    }
    hover_text += this_circle.attr("jump_link");
    url_list.append("li")
        .html(hover_text)
        .attr("class", "graph_url_list_item")
        .on("mouseover", function() { bfs_url_list_ingress_one(this, this_circle);})
        .on("mouseout", function() { bfs_url_list_egress_one(this, this_circle, scale);})
        .on("click", function() { bfs_url_list_click(this, this_circle.attr("jump_link"));});
}

function bfs_url_list_ingress_one(list_input, circle_input) {
    list_input.style.color = "blue";
    list_input.style.textDecoration = "underline";

    circle_input
        .attr("stroke", "#000000")
        .attr("stroke-width", 5)
        .attr("fill", "white")
        .attr("r", 12);
}

function bfs_url_list_egress_one(list_input, circle_input, scale) {
    list_input.style.color = "black";
    list_input.style.textDecoration = "none";

    color = scale(Number(circle_input.attr("id").slice(10)) % 10);
    circle_input
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("fill", color)
        .attr("r", 10);
}