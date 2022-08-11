; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	push	ebp

	mov		eax, 0
	push	eax	; (x1)

while0:
	; condition
	mov		eax, [ebp - 2 * 4]	; (x1)
	mov		ebx, 5
	cmp		eax, ebx
	jg		end_while0
	; body
	; statement_debug (int)
	mov		eax, [ebp + -2 * 4]	; (x1)
	call	iprintLF
	inc		eax
	mov		[ebp + -2 * 4], eax

	jmp		while0

end_while0:
	mov		eax, 10
	push	eax	; (x2)

while1:
	; condition
	mov		eax, [ebp - 3 * 4]	; (x2)
	mov		ebx, 5
	cmp		eax, ebx
	jl		end_while1
	; body
	; statement_debug (int)
	mov		eax, [ebp + -3 * 4]	; (x2)
	call	iprintLF
	dec		eax
	mov		[ebp + -3 * 4], eax

	jmp		while1

end_while1:
	mov		eax, 0
	push	eax	; (x3)

while2:
	; condition
	mov		eax, [ebp - 4 * 4]	; (x3)
	mov		ebx, 5
	cmp		eax, ebx
	jge		end_while2
	; body
	; statement_debug (int)
	mov		eax, [ebp + -4 * 4]	; (x3)
	call	iprintLF
	inc		eax
	mov		[ebp + -4 * 4], eax

	jmp		while2

end_while2:
	mov		eax, 10
	push	eax	; (x4)

while3:
	; condition
	mov		eax, [ebp - 5 * 4]	; (x4)
	mov		ebx, 5
	cmp		eax, ebx
	jle		end_while3
	; body
	; statement_debug (int)
	mov		eax, [ebp + -5 * 4]	; (x4)
	call	iprintLF
	dec		eax
	mov		[ebp + -5 * 4], eax

	jmp		while3

end_while3:
	mov		eax, 0
	push	eax	; (x5)

while4:
	; condition
	mov		eax, [ebp - 6 * 4]	; (x5)
	mov		ebx, 5
	cmp		eax, ebx
	je		end_while4
	; body
	; statement_debug (int)
	mov		eax, [ebp + -6 * 4]	; (x5)
	call	iprintLF
	inc		eax
	mov		[ebp + -6 * 4], eax

	jmp		while4

end_while4:
	mov		eax, 1
	push	eax	; (x)

while5:
	; condition
	mov		eax, [ebp - 7 * 4]	; (x)
	mov		ebx, 1
	cmp		eax, ebx
	jne		end_while5
	; body
	; statement_debug (int)
	mov		eax, [ebp + -7 * 4]	; (x)
	call	iprintLF
	inc		eax
	mov		[ebp + -7 * 4], eax

	jmp		while5

end_while5:
	mov		ebx, 0	; exit code
	call	_exit
