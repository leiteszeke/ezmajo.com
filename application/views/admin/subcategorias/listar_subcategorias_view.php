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
					<h1>Subcategorias <small>Listado de Subcategorias</small></h1>
				</section>
				<section class="content">
					<a href="{base_url}admin/subcategorias/agregar" class="btn btn-sm btn-info"><i class="fa fa-plus"></i>&nbsp;Agregar Subcategoria</a>
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Categoria Padre</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{subcategorias}
								<tr>
									<td>{nombre_subcategoria}</td>
									<td>{nombre_categoria}</td>
									<td>{estado}</td>
									<td>
										<button onclick="cambiarEstado({id_subcategoria});" class="btn btn-sm btn-{color}"><i class="fa fa-{icono}"></i></button>
										<button onclick="editarSubcategoria({id_subcategoria});" class="btn btn-sm btn-primary"><i class="fa fa-pencil"></i></button>
										<button onclick="borrarSubcategoria({id_subcategoria});" class="btn btn-sm btn-danger"><i class="fa fa-trash"></i></button>
									</td>
								</tr>
							{/subcategorias}
						</tbody>
					</table>
					<a data-toggle="modal" data-target="#editarModal" id="editarBtn"></a>
					<div class="modal fade" id="editarModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
					  	<div class="modal-dialog" role="document">
					    	<div class="modal-content">
						    	<form id="editarSubcategoriaForm" method="post">
						      		<div class="modal-header">
						       		 	<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						        		<h4 class="modal-title" id="myModalLabel">Editar Categoria</h4>
						      		</div>
						      		<div class="modal-body">
						        		<div class="form-group">
											<label class="control-label" for="editarNombreSubcategoria">Nombre</label>
											<input class="form-control" type="text" name="editarNombreSubcategoria" id="editarNombreSubcategoria" />
										</div>
						        		<div class="form-group">
											<label class="control-label" for="editarCategoriaSubcategoria">Categoria Padre</label>
											<select class="form-control" type="text" name="editarCategoriaSubcategoria" id="editarCategoriaSubcategoria">
												<option value="0">Seleccione Categoria</option>
												{categorias}
													<option value="{id_categoria}">{nombre_categoria}</option>
												{/categorias}
											</select>
										</div>
						      		</div>
						      		<div class="modal-footer">
						        		<input type="hidden" id="editarIdSubcategoria" name="editarIdSubcategoria" />
						        		<button type="button" class="btn btn-danger" data-dismiss="modal">Cancelar</button>
						        		<button type="submit" class="btn btn-success">Guardar Cambios</button>
						      		</div>
					      		</form>
					    	</div>
					  	</div>
					</div>
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/subcategories.js"></script>
	</body>
</html>