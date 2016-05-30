<header>
	<div class="col-md-2"></div>
	<div class="col-md-7">
		<form method="post" class="col-md-8 noPadding" id="formBuscador">
			<div class="col-md-11 noPadding">
				<input class="form-control" type="text" name="" id="textoBuscador" />
			</div>
			<div class="col-md-1 noPadding">
				<button type="submit" class="btn btn-default" id="botonBuscador"><i class="fa fa-search"></i></button>
			</div>
		</form>
	</div>
	<div class="col-md-3">
		<ul id="userMenu">
			<li><a href="{base_url}registro">Registrate</a></li>
			<li>|</li>
			<li><a href="{base_url}ingresar">Ingresar</a></li>
		</ul>
	</div>
</header>
<nav class="col-md-12">
	<ul id="categoriasMenu">
		{categorias}
			<li class="dropdown">
				<a href="{base_url}{link_categoria}" id="categoria_{id_categoria}" data-toggle="dropdown">{nombre_categoria}</a>
				{subcategorias}
					<span class="caret"></span>
					<ul class="dropdown-menu">
						{items}
							<li><a href="{base_url}{link_categoria}/{link_subcategoria}">{nombre_subcategoria}</a></li>
						{/items}
					</ul>
				{/subcategorias}
			</li>
		{/categorias}
	</ul>
</nav>
<div class="clearfix"></div>