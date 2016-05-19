<ul class="sidebar-menu">
	<li class="header">MENU PRINCIPAL</li>
	<li class="active treeview">
		<a href="{base_url}admin">
			<i class="fa fa-dashboard"></i> <span>Panel Principal</span></i>
		</a>
	</li>
	<li class="treeview">
		<a href="#">
			<i class="fa fa-shopping-bag"></i> 
			<span>Productos</span>
			<i class="fa fa-angle-left pull-right"></i>
		</a>
		<ul class="treeview-menu">
			<li><a href="{base_url}admin/productos/agregar"><i class="fa fa-circle-o"></i> Agregar Producto</a></li>
			<li><a href="{base_url}admin/productos/listar"><i class="fa fa-circle-o"></i> Listar Productos</a></li>
			<li><a href="{base_url}admin/productos/reporte"><i class="fa fa-circle-o"></i> Reporte de Productos</a></li>
		</ul>
	</li>
	<li class="treeview">
		<a href="#">
			<i class="fa fa-users"></i> 
			<span>Usuarios</span>
			<i class="fa fa-angle-left pull-right"></i>
		</a>
		<ul class="treeview-menu">
			<li><a href="{base_url}admin/usuarios/agregar"><i class="fa fa-circle-o"></i> Agregar Usuario</a></li>
			<li><a href="{base_url}admin/usuarios/listar"><i class="fa fa-circle-o"></i> Listar Usuarios</a></li>
			<li><a href="{base_url}admin/usuarios/reporte"><i class="fa fa-circle-o"></i> Reporte de Usuarios</a></li>
		</ul>
	</li>
	{esAdmin}
		<li class="treeview">
			<a href="#">
				<i class="fa fa-tasks"></i>
				<span>Categorias</span>
				<i class="fa fa-angle-left pull-right"></i>
			</a>
			<ul class="treeview-menu">
				<li><a href="{base_url}admin/categorias/agregar"><i class="fa fa-circle-o"></i> Agregar Categoria</a></li>
				<li><a href="{base_url}admin/categorias/listar"><i class="fa fa-circle-o"></i> Listar Categorias</a></li>
				<li><a href="{base_url}admin/categorias/reporte"><i class="fa fa-circle-o"></i> Reporte de Categorias</a></li>
			</ul>
		</li>
		<li class="treeview">
			<a href="#">
				<i class="fa fa-sliders"></i> 
				<span>Subcategorias</span>
				<i class="fa fa-angle-left pull-right"></i>
			</a>
			<ul class="treeview-menu">
				<li><a href="{base_url}admin/subcategorias/agregar"><i class="fa fa-circle-o"></i> Agregar Subcategoria</a></li>
				<li><a href="{base_url}admin/subcategorias/listar"><i class="fa fa-circle-o"></i> Listar Subcategorias</a></li>
				<li><a href="{base_url}admin/subcategorias/reporte"><i class="fa fa-circle-o"></i> Reporte de Subcategorias</a></li>
			</ul>
		</li>
		<li class="treeview">
			<a href="#">
				<i class="fa fa-star"></i> 
				<span>Rangos</span>
				<i class="fa fa-angle-left pull-right"></i>
			</a>
			<ul class="treeview-menu">
				<li><a href="{base_url}admin/rangos/agregar"><i class="fa fa-circle-o"></i> Agregar Rango</a></li>
				<li><a href="{base_url}admin/rangos/listar"><i class="fa fa-circle-o"></i> Listar Rangos</a></li>
				<li><a href="{base_url}admin/rangos/reporte"><i class="fa fa-circle-o"></i> Reporte de Rangos</a></li>
			</ul>
		</li>
	{/esAdmin}
	<li class="treeview">
		<a href="{base_url}admin/estadisticas"><i class="fa fa-bar-chart"></i><span>Estadisticas</span></a>
	</li>
</ul>