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
					<h1>Subcategorias <small>Nueva Subcategoria</small></h1>
				</section>
				<section class="content">
					<form class="form" id="subcategoriaForm" method="post">
						<div class="form-group">
							<label class="control-label" for="nombreSubcategoria">Nombre de la Subcategoria</label>
							<input class="form-control" type="text" name="nombreSubcategoria" id="nombreSubcategoria" />
						</div>
						<div class="form-group">
							<label class="control-label" for="categoriaSubcategoria">Categoria Padre</label>
							<select class="form-control" name="categoriaSubcategoria" id="categoriaSubcategoria">
								<option value="0">Seleccione Categoria</option>
								{categorias}
									<option value="{id_categoria}">{nombre_categoria}</option>
								{/categorias}
							</select>
						</div>
						<div class="form-group text-right">
							<button type="submit" class="btn btn-sm btn-primary"><i class="fa fa-sign-in"></i>&nbsp;Crear</button>
						</div>
					</form>
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/subcategories.js"></script>
	</body>
</html>