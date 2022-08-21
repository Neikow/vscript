; --------------------------
;     Generated assembly    
; --------------------------

%include	'utils.asm'

%include	'std/types.asm'

section .text
global  _start

_start:
	xor		rax, rax
	xor		rbx, rbx
	xor		rcx, rcx
	xor		rdx, rdx
	mov		rbp, rsp	; save program base pointer
	push	rbp

; Memory Allocation
	mov		rcx, 16384
	call	memalloc


	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	inc		qword [rax + 1 * 8]

	; statement_debug (tuple)
	mov		rdx, _s0
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rax, [rbp - 2 * 8]
	push	rax	; = &x
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	inc		qword [rax + 1 * 8]

	; statement_debug (tuple)
	mov		rdx, _s2
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rax, [rbp - 3 * 8]
	push	rax	; = &y
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s3
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_and
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s4
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_and
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s5
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_and
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s6
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_and
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s7
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_or
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s8
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_or
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s9
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_or
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s10
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_or
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s11
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_xor
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s12
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_xor
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s13
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_xor
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s14
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rdx
	pop		rcx
	call	bool_xor
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s15
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 1	; bool value
	call	bool_make
	push	rax
	pop		rcx
	call	bool_not
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	; statement_debug (tuple)
	mov		rdx, _s16
	mov		rcx, 14
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rdx, _s1
	mov		rcx, 1
	call	string_make
	push	rax
	pop		rsi
	mov		rdx, [rsi + 16]	; string length
	mov		rcx, [rsi + 24]	; char array pointer
	call	sprint

	mov		rcx, 0	; bool value
	call	bool_make
	push	rax
	pop		rcx
	call	bool_not
	push	rax
	pop		rcx
	mov		rcx, [rcx + 2 * 8]
	call	bprintLF

	xor		rcx, rcx	; 0 exit code
	call	exit

section .rodata
true: db 'true'
false: db 'false'
_s0: db 'true          ', 0h, 0h
_s1: db ' ', 0h, 0h, 0h, 0h, 0h, 0h, 0h
_s2: db 'false         ', 0h, 0h
_s3: db 'true && true  ', 0h, 0h
_s4: db 'true && false ', 0h, 0h
_s5: db 'false && true ', 0h, 0h
_s6: db 'false && false', 0h, 0h
_s7: db 'true || true  ', 0h, 0h
_s8: db 'true || false ', 0h, 0h
_s9: db 'false || true ', 0h, 0h
_s10: db 'false || false', 0h, 0h
_s11: db 'true !| true  ', 0h, 0h
_s12: db 'true !| false ', 0h, 0h
_s13: db 'false !| true ', 0h, 0h
_s14: db 'false !| false', 0h, 0h
_s15: db '!true         ', 0h, 0h
_s16: db '!false        ', 0h, 0h

section .data
brk_init: dq 0x0
brk_curr: dq 0x0
brk_new: dq 0x0


section .bss
output_buffer: resb 128
