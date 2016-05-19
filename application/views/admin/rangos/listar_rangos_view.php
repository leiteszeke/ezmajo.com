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
					<h1>Rangos <small>Listado de Rangos</small></h1>
				</section>
				<section class="content">
					<a href="{base_url}admin/rangos/agregar" class="btn btn-sm btn-info"><i class="fa fa-plus"></i>&nbsp;Agregar Rango</a>
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Nª de Usuarios</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{rangos}
								<tr>
									<td>{nombre_rango}</td>
									<td>{cantidad_usuarios}</td>
									<td>{estado}</td>
									<td>
										<button onclick="cambiarEstado({id_rango});" class="btn btn-sm btn-{color}"><i class="fa fa-{icono}"></i></button>
										<button onclick="editarRango({id_rango});" class="btn btn-sm btn-primary"><i class="fa fa-pencil"></i></button>
										<button onclick="borrarRango({id_rango});" class="btn btn-sm btn-danger"><i class="fa fa-trash"></i></button>
									</td>
								</tr>
							{/rangos}
						</tbody>
					</table>
					<a data-toggle="modal" data-target="#editarModal" id="editarBtn"></a>
				</section>
			</div>
			<div class="modal fade" id="editarModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
			  	<div class="modal-dialog" role="document">
			    	<div class="modal-content">
				    	<form id="editarRangoForm" method="post">
				      		<div class="modal-header">
				       		 	<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				        		<h4 class="modal-title" id="myModalLabel">Editar Rango</h4>
				      		</div>
				      		<div class="modal-body">
				        		<div class="form-group">
				        			<label class="control-label" for="editarNombreRango">Nombre del Rango</label>
				        			<input class="form-control" type="text" name="editarNombreRango" id="editarNombreRango" />
				        		</div>
				      		</div>
				      		<div class="modal-footer">
				        		<input type="hidden" id="editarIdRango" name="editarIdRango" />
				        		<button type="button" class="btn btn-danger" data-dismiss="modal">Cancelar</button>
				        		<button type="submit" class="btn btn-success">Guardar Cambios</button>
				      		</div>
			      		</form>
			    	</div>
			  	</div>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/ranks.js"></script>
	</body>
</html>