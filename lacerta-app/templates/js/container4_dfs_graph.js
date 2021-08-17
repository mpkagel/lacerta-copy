
function spiral_plot(graph_start_url, graph_depth, keyword, width, height, scale, points, lines, node_labels, node_urls) {
    // Use r(t) = kt
    var r = width/100*2;
    var k = 16;
    var j = 0;
    var q = 0;
    p_list = {};
    l_list = {};

    var node_count = points.length;
    var link_count = lines.length;
    if (node_count == link_count) {
        lines = lines.slice(0, link_count - 1);
    }

    var svg = d3.select(".crawler_graph")
            .attr("width", "95.44%")
            .attr("height", "95.44%")
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

    points.forEach(function(p) {
        p_list[p.id] = {};
        q = Math.sqrt(k*j++);
        if (j == 1) {
            j = 2;
        }
        p_list[p.id].x = r*q*Math.cos(q);
        p_list[p.id].y = r*q*Math.sin(q);
        p_list[p.id].has_keyword = p.has_keyword;
    });

    j = 0;
    lines.forEach(function(l) {
        l_list[j] = {};
        l_list[j].x1 = p_list[l.source].x;
        l_list[j].x2 = p_list[l.target].x;
        l_list[j].y1 = p_list[l.source].y;
        l_list[j++].y2 = p_list[l.target].y;
    });

    var data_points = Object.keys(p_list).map(function(key, i) {
        return {"id": key, "index": i, "x": p_list[key].x, "y": p_list[key].y, "has_keyword": p_list[key].has_keyword};
    });

    var data_lines = Object.keys(l_list).map(function(key) {
        return {"source": {"x": l_list[key].x1, "y": l_list[key].y1}, "target": {"x": l_list[key].x2, "y": l_list[key].y2}};
    });

    var link = svg.append("g")
        .selectAll("line")
        .data(data_lines)
        .enter().append("line")
            .attr("class", "graph_line")
            .attr("stroke", "#717171")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 3);

    var node = svg.append("g")
        .selectAll("rect")
        .data(data_points)
        .enter().append("rect")
            .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .attr("width", 22)
          .attr("height", 22)
          .attr("rx", 4)
          .attr("ry", 4);

    var node_trans = d3.transition()
                            .duration(300)
                            .ease(d3.easeLinear)
                            .on("end", nodes_ended);

    node
        .transition(node_trans)
            .attr("x", d => d.x - 11)
            .attr("y", d => d.y - 11)
            .attr("fill", color = function(d) { return scale(d.index % 10);})
            .attr("id", function(d) { return "graph_node" + String(d.index);})
            .attr("jump_link", function(d) { return node_urls[d.index]; });

    function nodes_ended() {
        var link_trans = d3.transition()
                            .duration(300)
                            .ease(d3.easeLinear)
                            .on("end", dfs_ended);

        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.source.x; })
            .attr("y2", function(d) { return d.source.y; });;

        link
            .transition(link_trans)
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

        function dfs_ended() {
            defs = svg.append("defs");
            defs.append("marker")
                .attr("id", "graph_arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 20)
                .attr("refY", 0)
                .attr("markerWidth", 4.8)
                .attr("markerHeight", 4.8)
                .attr("orient", "auto")
                .append("path")
                    .attr("d", "M0,-5L10,0L0,5")
                    .attr("class","graph_arrowhead");

            defs.append("marker")
                .attr("id", "graph_asterisk")
                .attr("viewBox", "0 0 10 10")
                .attr("refX", -2.9)
                .attr("refY", -2.8)
                .attr("markerWidth", 14)
                .attr("markerHeight", 14)
                .attr("orient", 0)
                .attr("fill", "white")
                .append("path")
                    .attr("d", "M5,0L4,0L4,3.3L1.1,1.7L0.2,3.4L3,5L0.2,6.6L1.1,8.4L4,6.7L4,10L6,10L6,6.7L8.9,8.4L9.8,6.6L7,5L9.8,3.4L8.9,1.7L6,3.3L6,0")
                    .attr("class","graph_asterisk_path");

            d3.selectAll(".graph_line")
                .attr("marker-end", "url(#graph_arrow)")

            var stop_word = keyword;
            if (stop_word === "") {
                stop_word = "(None)";
            }
            var supplemental_list = d3.select(".graph_url_list");
            supplemental_list.append("div")
                .append("h6").text("Start URL: " + graph_start_url);
            supplemental_list.append("div")
                .append("h6").text("Crawl Type: DFS");
            supplemental_list.append("div")
                .append("h6").text("Depth: " + graph_depth);
            supplemental_list.append("div")
                .append("h6").text("Stop Word: " + stop_word);
            supplemental_list.append("div")
                .append("h6").text("Nodes: ");

            var final_nodes = d3.selectAll(".crawler_graph rect");
            final_nodes.on("mouseover", function(item) { rect_node_ingress(this, node_labels, node_urls, width, height, item["has_keyword"], keyword)})
                        .on("mouseout", function() { rect_node_egress(this, scale)})
                        .on("click", rect_node_click)
                        .each( function(item) {
                                if (item["has_keyword"]) {
                                    supplemental_list.append("div")
                                                        .text("(Keyword Was Found)")
                                                        .attr("class", "graph_url_list_title");
                                    this_rect = d3.select(this);
                                    this_rect_parent = d3.select(this.parentNode);
                                    this_rect_parent.append("line")
                                            .attr("class", "graph_line")
                                            .attr("id", "graph_asterisk_line")
                                            .attr("x1", this_rect.attr("x"))
                                            .attr("y1", this_rect.attr("y"))
                                            .attr("x2", this_rect.attr("x"))
                                            .attr("y2", this_rect.attr("y"))
                                            .attr("marker-end", "url(#graph_asterisk)")
                                            .attr("stroke-width", 1)
                                            .attr("stroke", "white")
                                }
                        })
                        .each( function(item) {
                            dfs_add_supplemental_url(this, supplemental_list, scale, item["has_keyword"]);
                        });

            var final_lines = d3.selectAll(".crawler_graph .graph_line");

            svg.call(d3.zoom().on("zoom", function() {
                final_nodes.attr("transform", d3.event.transform);
                final_lines.attr("transform", d3.event.transform);
            }));   
        }   
    } 
}

function rect_node_ingress(input, node_labels, node_urls, width, height, has_keyword, keyword) {
    var this_rect = d3.select(input);
    var node_label_text = node_labels[Number(this_rect.attr("id").slice(10))];
    var node_url_text = node_urls[Number(this_rect.attr("id").slice(10))];
    var current_x = Number(this_rect.attr("x"));
    var current_y = Number(this_rect.attr("y"));
    var transform_x = 0;
    var transform_y = 0;
    var transform_scale = 1;
    if (this_rect.attr("transform") != null) {
        transform_x = Number((this_rect.attr("transform").split('(')[1]).split(',')[0]);
        transform_y = Number(((this_rect.attr("transform").split('(')[1]).split(',')[1]).split(')')[0]);
        transform_scale = Number((this_rect.attr("transform").split('(')[2]).split(')')[0]);
    }
    this_rect
        .attr("stroke", "#000000")
        .attr("stroke-width", 7)
        .attr("fill", "white")
        .attr("x", current_x - 3)
        .attr("y", current_y - 3)
        .attr("width", 28)
        .attr("height", 28);
    var rect_x = Number(this_rect.attr("x"));
    var rect_y = Number(this_rect.attr("y"));
    var label_x = String(transform_scale * (rect_x + 45) + transform_x + width/2) + "px";
    var label_y = String(transform_scale * (rect_y - 65) + transform_y + height/2) + "px";
    var overall_container = d3.select("#container4");
    var hover_text = "";
    if (Number(this_rect.attr("id").slice(10)) == 0) {
        hover_text += "<b><i>Start URL</i></b><br/>";
    }
    if (has_keyword) {
        hover_text += "<b><i>Has Keyword: </b>" + keyword + "</i><br/>";
    }
    hover_text += "<b>Title: </b>" + node_label_text + "<br/>" + "<b>URL: </b>" + node_url_text;
    overall_container.append("div")
                        .html(hover_text)
                        .attr("id", "graph_node_label");
    var new_node_label = document.getElementById("graph_node_label");
    new_node_label.style.left = label_x;
    new_node_label.style.top = label_y;
}

function rect_node_egress(input, scale) {
    color = scale(Number(input.id.slice(10)) % 10);
    this_rect = d3.select(input);
    var current_x = Number(this_rect.attr("x"));
    var current_y = Number(this_rect.attr("y"));
    this_rect
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("fill", color)
        .attr("x", current_x + 3)
        .attr("y", current_y + 3)
        .attr("width", 22)
        .attr("height", 22);
    d3.selectAll("#container4 #graph_node_label").remove();
}

function rect_node_click() {
    this_rect = d3.select(this);
    var url_link = this_rect.attr("jump_link");
    window.open(url_link, "_blank");
}

function dfs_add_supplemental_url(input, url_list, scale, has_keyword) {
    var this_rect = d3.select(input);
    var hover_text = "";
    if (Number(this_rect.attr("id").slice(10)) == 0) {
        hover_text += "<i>(Start URL)</i> ";
    }
    if (has_keyword) {
        hover_text += "<i>(Has Keyword)</i> ";
    }
    hover_text += this_rect.attr("jump_link");
    url_list.append("li")
        .html(hover_text)
        .attr("class", "graph_url_list_item")
        .on("mouseover", function() { dfs_url_list_ingress(this, this_rect);})
        .on("mouseout", function() { dfs_url_list_egress(this, this_rect, scale);})
        .on("click", function() { dfs_url_list_click(this, this_rect);});
}

function dfs_url_list_ingress(list_input, rect_input) {
    list_input.style.color = "blue";
    list_input.style.textDecoration = "underline";

    var current_x = Number(rect_input.attr("x"));
    var current_y = Number(rect_input.attr("y"));
    rect_input
        .attr("stroke", "#000000")
        .attr("stroke-width", 7)
        .attr("fill", "white")
        .attr("x", current_x - 3)
        .attr("y", current_y - 3)
        .attr("width", 28)
        .attr("height", 28);
}

function dfs_url_list_egress(list_input, rect_input, scale) {
    list_input.style.color = "black";
    list_input.style.textDecoration = "none";

    color = scale(Number(rect_input.attr("id").slice(10)) % 10);
    var current_x = Number(rect_input.attr("x"));
    var current_y = Number(rect_input.attr("y"));
    rect_input
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("fill", color)
        .attr("x", current_x + 3)
        .attr("y", current_y + 3)
        .attr("width", 22)
        .attr("height", 22);
}

function dfs_url_list_click(list_input, rect_input) {
    var url_link = rect_input.attr("jump_link");
    window.open(url_link, "_blank");
}

function spiral_plot_one(graph_start_url, graph_depth, keyword, width, height, scale, points, node_labels, node_urls) {
    // Use r(t) = kt
    var r = width/100*2;
    var k = 16;
    var j = 0;
    var q = 0;
    p_list = {};

    var node_count = points.length;

    var svg = d3.select(".crawler_graph")
            .attr("width", "95.44%")
            .attr("height", "95.44%")
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

    points.forEach(function(p) {
        p_list[p.id] = {};
        q = Math.sqrt(k*j++);
        if (j == 1) {
            j = 2;
        }
        p_list[p.id].x = r*q*Math.cos(q);
        p_list[p.id].y = r*q*Math.sin(q);
        p_list[p.id].has_keyword = p.has_keyword;
    });

    var data_points = Object.keys(p_list).map(function(key, i) {
        return {"id": key, "index": i, "x": p_list[key].x, "y": p_list[key].y, "has_keyword": p_list[key].has_keyword};
    });

    var node = svg.append("g")
        .selectAll("rect")
        .data(data_points)
        .enter().append("rect")
            .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .attr("width", 22)
          .attr("height", 22)
          .attr("rx", 4)
          .attr("ry", 4);

    var node_trans = d3.transition()
                            .duration(300)
                            .ease(d3.easeLinear)
                            .on("end", nodes_ended);

    node
        .transition(node_trans)
            .attr("x", d => d.x - 11)
            .attr("y", d => d.y - 11)
            .attr("fill", color = function(d) { return scale(d.index % 10);})
            .attr("id", function(d) { return "graph_node" + String(d.index);})
            .attr("jump_link", function(d) { return node_urls[d.index]; });

    function nodes_ended() {
        defs = svg.append("defs");
    
        defs.append("marker")
            .attr("id", "graph_asterisk")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", -2.9)
            .attr("refY", -2.8)
            .attr("markerWidth", 14)
            .attr("markerHeight", 14)
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
            .append("h6").text("Nodes:");


        var final_nodes = d3.selectAll(".crawler_graph rect");
        final_nodes.on("mouseover", function(item) { rect_node_ingress(this, node_labels, node_urls, width, height, item["has_keyword"], keyword)})
                    .on("mouseout", function() { rect_node_egress(this, scale)})
                    .on("click", rect_node_click)
                    .each( function(item) {
                            if (item["has_keyword"]) {
                                supplemental_list.append("div")
                                                    .text("(Keyword Was Found)")
                                                    .attr("class", "graph_url_list_title");
                                this_rect = d3.select(this);
                                this_rect_parent = d3.select(this.parentNode);
                                this_rect_parent.append("line")
                                        .attr("class", "graph_line")
                                        .attr("id", "graph_asterisk_line")
                                        .attr("x1", this_rect.attr("x"))
                                        .attr("y1", this_rect.attr("y"))
                                        .attr("x2", this_rect.attr("x"))
                                        .attr("y2", this_rect.attr("y"))
                                        .attr("marker-end", "url(#graph_asterisk)")
                                        .attr("stroke-width", 1)
                                        .attr("stroke", "white")
                            }
                    })
                    .each( function(item) {
                        dfs_add_supplemental_url(this, supplemental_list, scale, item["has_keyword"]);
                    });

       var final_lines = d3.selectAll(".crawler_graph .graph_line");

        svg.call(d3.zoom().on("zoom", function() {
            final_nodes.attr("transform", d3.event.transform);
            final_lines.attr("transform", d3.event.transform);
        }));    
    } 
}