<!DOCTYPE html>
<html lang="en">
	<head>
		{head}
	</head>
	<body>
		{menu}
		<a href="{base_url}admin/usuarios/agregar" class="btn btn-sm btn-info"><i class="fa fa-plus"></i>&nbsp;Agregar Usuario</a>
		<table class="table table-bordered">
			<thead>
				<tr>
					<th>Nombre y Apellido</th>
					<th>Nombre de Usuario</th>
					<th>Email</th>
					<th>Fecha de Nacimiento</th>
					<th>Rango</th>
					<th>Estado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{usuarios}
					<tr>
						<td>{nombre_usuario} {apellido_usuario}</td>
						<td>{nick_usuario}</td>
						<td>{email_usuario}</td>
						<td>{fecha}</td>
						<td>{rango}</td>
						<td>{estado}</td>
						<td>
							<button onclick="cambiarEstado({id_usuario});" class="btn btn-sm btn-{color}"><i class="fa fa-{icono}"></i></button>
							<button onclick="editarUsuario({id_usuario});" class="btn btn-sm btn-primary"><i class="fa fa-pencil"></i></button>
							<button onclick="borrarUsuario({id_usuario});" class="btn btn-sm btn-danger"><i class="fa fa-trash"></i></button>
						</td>
					</tr>
				{/usuarios}
			</tbody>
		</table>
		<a data-toggle="modal" data-target="#editarModal" id="editarBtn"></a>
		{footer}
		<div class="modal fade" id="editarModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
		  	<div class="modal-dialog" role="document">
		    	<div class="modal-content">
			    	<form id="editarUsuarioForm" method="post">
			      		<div class="modal-header">
			       		 	<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
			        		<h4 class="modal-title" id="myModalLabel">Editar Usuario</h4>
			      		</div>
			      		<div class="modal-body">
			        		<div class="form-group">
								<label class="control-label" for="editarNombreUsuario">Nombre</label>
								<input class="form-control" type="text" name="editarNombreUsuario" id="editarNombreUsuario" />
							</div>
							<div class="form-group">
								<label class="control-label" for="editarApellidoUsuario">Apellido</label>
								<input class="form-control" type="text" name="editarApellidoUsuario" id="editarApellidoUsuario" />
							</div>
							<div class="form-group">
								<label class="control-label" for="editarNacimientoUsuario">Fecha de Nacimiento</label>
								<input class="form-control" type="date" name="editarNacimientoUsuario" id="editarNacimientoUsuario" />
							</div>
							<div class="form-group">
								<label class="control-label" for="editarRangoUsuario">Rango</label>
								<select class="form-control" name="editarRangoUsuario" id="editarRangoUsuario">
									<option value="0">Seleccione Rango</option>
									{rangos}
										<option value="{id_rango}">{nombre_rango}</option>
									{/rangos}
								</select>
							</div>
			      		</div>
			      		<div class="modal-footer">
			        		<input type="hidden" id="editarIdUsuario" name="editarIdUsuario" />
			        		<button type="button" class="btn btn-danger" data-dismiss="modal">Cancelar</button>
			        		<button type="submit" class="btn btn-success">Guardar Cambios</button>
			      		</div>
		      		</form>
		    	</div>
		  	</div>
		</div>
		<script type="text/javascript" src="{base_url}js/admin/categories.js"></script>
	</body>
</html>