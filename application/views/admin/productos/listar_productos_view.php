<!DOCTYPE html>
<html>
	<head>
		{head}
	</head>
	<body class="hold-transition skin-blue sidebar-mini">
		<div class="wrapper">
			{header}
			{sidebar}
			<div class="content-wrapper">
				<section class="content-header">
					<h1>Productos <small>Listado de Productos</small></h1>
				</section>
				<section class="content">
					<a href="{base_url}admin/productos/agregar" class="btn btn-sm btn-info"><i class="fa fa-plus"></i>&nbsp;Agregar Producto</a>
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Producto</th>
								<th>Stock</th>
								<th>Precio</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{productos}
								<tr>
									<td>{nombre_producto}<br>{categoria} {subcategoria}</td>
									<td>{stock_producto}</td>
									<td>$ {precio_producto}</td>
									<td>{estado}</td>
									<td>
										<button onclick="cambiarEstado({id_producto});" class="btn btn-sm btn-{color}"><i class="fa fa-{icono}"></i></button>
										<a href="{base_url}admin/productos/editar/{id_producto}"><button class="btn btn-sm btn-primary"><i class="fa fa-search"></i></button></a>
										<button onclick="borrarProducto({id_producto});" class="btn btn-sm btn-danger"><i class="fa fa-trash"></i></button>
									</td>
								</tr>
							{/productos}
						</tbody>
					</table>
					{paginador}
						<nav class="nav-pagination">
						  	<ul class="pagination">
						    	{mostrarPrimera}
						    		<li><a class="next" href="{base_url}admin/productos/listar/1" aria-label="Previous">Primera</a></li>
						    	{/mostrarPrimera}
						    	{paginas}
						    		<li class="{active}"><a href="{base_url}admin/productos/listar/{n_pagina}">{n_pagina}</a></li>
						    	{/paginas}
						    	{mostrarUltima}
						    		<li><a class="next" href="{base_url}admin/productos/listar/{ultimaPagina}" aria-label="Next">Última</a></li>
						    	{/mostrarUltima}
						  	</ul>
						</nav>
					{/paginador}
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/products.js"></script>
	</body>
</html>