{carousel}
	<div id="carousel-example-generic" class="carousel slide" data-ride="carousel">
		<ol class="carousel-indicators">
			{bullets}
				<li data-target="#carousel-example-generic" data-slide-to="{id_carousel}" class="{active}"></li>
			{/bullets}
		</ol>
		<div class="carousel-inner" role="listbox">
			{items}
				<div class="item {active}">
					<img src="{base_url}data/upload/carousel/{archivo_carousel}" alt="{nombre_carousel}" class="img-responsive" />	
				</div>
			{/items}
		</div>
		<a class="left carousel-control" href="#carousel-example-generic" role="button" data-slide="prev">
			<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
			<span class="sr-only">Previous</span>
		</a>
		<a class="right carousel-control" href="#carousel-example-generic" role="button" data-slide="next">
			<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>
			<span class="sr-only">Next</span>
		</a>
	</div>
{/carousel}