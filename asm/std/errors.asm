err_out_of_bounds:
	mov		rcx, str_err_out_of_bounds_name
	mov		rdx, 21
	call	sprint
	call	linefeed
	mov		rcx, str_err_out_of_bounds_desc
	mov		rdx, 51
	call	sprint
	call	linefeed
	mov		rcx, 1
	call	exit

