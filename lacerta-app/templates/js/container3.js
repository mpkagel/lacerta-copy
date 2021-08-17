$(document).ready(function() {
	$('#new_query_button').click( function (e) {
	    e.preventDefault();
	    let start_url = $("#start_url").val();
        if (start_url === "") {
            alert("Please input a starting URL");
            return false;
        }
	    d3.selectAll(".crawler_graph g").remove();
        d3.selectAll(".crawler_graph defs").remove();
        d3.selectAll(".graph_url_list div").remove();
        d3.selectAll(".graph_url_list li").remove();
		let data = {};
		data["start_url"] = start_url;
		data["depth"] = $("#depth").val();
		data["keyword"] = $("#keyword").val();
		data["search_type"] = $("input[name='search_type']:checked").val();
        $.ajax({
            type: "POST",
            url: "dev/query",
            //url: "/query",
            data: data,
            success: function(output) {
                graph = JSON.parse(output);
                $("#container1").load(location.href + " #container1>*", "");
                plotCrawlerGraph(graph);
            },
            error: function(xhr, textStatus, error) {
                d3.select(".graph_url_list")
                    .append("div")
                    .text("Search failed: status " + xhr.status + ", " + textStatus + ", " + error + ", " + xhr.responseJSON["message"])
                    .attr("class", "graph_url_list_error");
            }
        });
	});
});

// change depth menu drop down values
function depthMenu(searchType){
	const a = ['1','2','3'];
	const b = ['1','2','3','4','5','6','7','8','9','10', '11','12','13','14','15','16','17','18','19','20'];
	let s = document.getElementById('depth');
	for(var i = s.options.length-1; i >= 0 ; i--) { s.options[i] = null; }
	if(searchType.value !== 0){
		let z;
		switch (searchType.value) {
			case 'BFS' : z = a; break;
			case 'DFS' : z = b; break;
			default : alert('Error: Invalid search type'); break;
		}
		for(i = 0; i < z.length; i++ ) {
		  s.options[i] = new Option(z[i],z[i],false,false);
		}
	}
}

function plotCrawlerGraph(graph) {
    console.log(graph);

    var parent_container = document.getElementById("container4");
    var width = parent_container.offsetWidth * 0.9544;
    var height = parent_container.offsetHeight * 0.9544;
    const scale = d3.scaleOrdinal(d3.schemeCategory10);
    var node_labels = [];
    var node_urls = [];

    graph.nodes.forEach(function(e) {
        node_labels.push(e.title);
        node_urls.push(e.id);
    });

    if (graph.nodes.length === 1) {
        if (graph.type === "BFS") {
            force_directed_plot_one(graph.start_url, graph.depth, graph.keyword, width, height, scale, graph.nodes);
        } else {
            spiral_plot_one(graph.start_url, graph.depth, graph.keyword, width, height, scale, graph.nodes, node_labels, node_urls);
        }
    } else {
    	if (graph.type === "BFS") {
            force_directed_plot(graph.start_url, graph.depth, graph.keyword, width, height, scale, graph.nodes, graph.links);
        } else {
            spiral_plot(graph.start_url, graph.depth, graph.keyword, width, height, scale, graph.nodes, graph.links, node_labels, node_urls);
        }
    }
}
