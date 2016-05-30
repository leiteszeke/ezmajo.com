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
					<h1>Productos <small>Editar Producto</small></h1>
				</section>
				<section class="content">
					{producto}
						<form class="form" id="editarProductoForm" method="post">
							<div class="form-group col-md-2">
								<label class="control-label" for="codigoProducto">Codigo del Producto</label>
								<input class="form-control" type="text" name="codigoProducto" id="codigoProducto" value="{codigo_producto}" />
							</div>
							<div class="form-group col-md-5">
								<label class="control-label" for="nombreProducto">Nombre del Producto</label>
								<input class="form-control" type="text" name="nombreProducto" id="nombreProducto" value="{nombre_producto}" />
							</div>
	 						<div class="form-group col-md-2">
	 							<label class="control-label" for="monedaProducto">Moneda</label>
	 							<select class="form-control" name="monedaProducto" id="monedaProducto">
	 								<option value="0">Moneda</option>
	 								{monedas}
	 									<option value="{id_moneda}" {selected}>{tipo_moneda}</option>
	 								{/monedas}
	 							</select>
	 						</div>
	 						<div class="form-group col-md-3">
	 							<label class="control-label" for="precioProducto">Precio</label>
	 							<input class="form-control" type="number" name="precioProducto" id="precioProducto" value="{precio_producto}" />
	 						</div>
							<div class="form-group col-md-6">
								<label class="control-label" for="categoriaProducto">Categoria</label>
								<select class="form-control" name="categoriaProducto" id="categoriaProducto">
									<option value="0">Seleccionar Categoria</option>
									{categorias}
										<option value="{id_categoria}" {selected}>{nombre_categoria}</option>
									{/categorias}
								</select>
							</div>
							<div class="form-group col-md-6">
								<label class="control-label" for="subcategoriaProducto">Subcategoria</label>
								<select class="form-control" name="subcategoriaProducto" id="subcategoriaProducto" disabled>
									<option value="0">Seleccionar Subcategoria</option>
								</select>
							</div>
	 						<div class="form-group col-md-6">
	 							<label class="control-label" for="imagenProducto">Imagen</label>
	 							<input class="form-control" type="file" multiple name="imagenProducto[]" id="imagenProducto" />
	 						</div>
	 						<div class="form-group col-md-6">
	 							<label class="control-label" for="stockProducto">Stock</label>
	 							<input class="form-control" type="number" name="stockProducto" id="stockProducto" value="{stock_producto}" />
	 						</div>
							<div class="form-group col-md-12">
								<label class="control-label" for="descripcionProducto">Descripción</label>
								<textarea rows="5" class="form-control" name="descripcionProducto" id="descripcionProducto">{descripcion_producto}</textarea>
	 						</div>
	 						<div class="form-group col-md-12">
	 							{archivos}
	 								<div class="col-md-2 noPadding" id="archivo_{id_imagen}">
	 									<img class="img-responsive" src="{base_url}data/upload/productos/{archivo_imagen}" />
	 									<div class="div-cerrar">
	 										<span class="pointer" onclick="borrarArchivo({id_imagen});"><i class="fa fa-close"></i>&nbsp;&nbsp;Borrar</span>
	 									</div>
	 								</div>
	 							{/archivos}
	 						</div>
							<div class="form-group col-md-12 text-right">
								<input type="hidden" name="idProducto" id="idProducto" value="{id_producto}" />
								<button type="submit" class="btn btn-sm btn-primary"><i class="fa fa-check"></i>&nbsp;Guardar</button>
							</div>
							<div class="clearfix"></div>
						</form>
					{/producto}
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/products.js"></script>
		<script type="text/javascript">
			{ejecutar}
				cambiaCategoria(seleccionarSubcategoria, {subcategoria_producto});
			{/ejecutar}
		</script>
	</body>
</html>