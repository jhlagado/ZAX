; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_fvar begin
byte_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ex DE, HL                      ; 0113: EB
ld E, (IX + $0006)             ; 0114: DD 5E 06
ld D, (IX + $0007)             ; 0117: DD 56 07
ex DE, HL                      ; 011A: EB
add HL, DE                     ; 011B: 19
ld A, (HL)                     ; 011C: 7E
pop HL                         ; 011D: E1
pop DE                         ; 011E: D1
push DE                        ; 011F: D5
push HL                        ; 0120: E5
ld E, (IX + $0004)             ; 0121: DD 5E 04
ld D, (IX + $0005)             ; 0124: DD 56 05
ex DE, HL                      ; 0127: EB
ld E, (IX + $0006)             ; 0128: DD 5E 06
ld D, (IX + $0007)             ; 012B: DD 56 07
ex DE, HL                      ; 012E: EB
add HL, DE                     ; 012F: 19
ld (HL), A                     ; 0130: 77
pop HL                         ; 0131: E1
pop DE                         ; 0132: D1
ld H, $0000                    ; 0133: 26 00
ld L, A                        ; 0135: 6F
__zax_epilogue_0:
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func byte_fvar_fvar end
; func main begin
main:
push IX                        ; 013E: DD E5
ld IX, $0000                   ; 0140: DD 21 00 00
add IX, SP                     ; 0144: DD 39
push AF                        ; 0146: F5
push BC                        ; 0147: C5
push DE                        ; 0148: D5
push HL                        ; 0149: E5
ld HL, $0005                   ; 014A: 21 05 00
push HL                        ; 014D: E5
ld HL, glob_bytes              ; 014E: 21 00 00
push HL                        ; 0151: E5
call byte_fvar_fvar            ; 0152: CD 00 00
inc SP                         ; 0155: 33
inc SP                         ; 0156: 33
inc SP                         ; 0157: 33
inc SP                         ; 0158: 33
__zax_epilogue_1:
pop HL                         ; 0159: E1
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func main end

; symbols:
; label byte_fvar_fvar = $0100
; label __zax_epilogue_0 = $0136
; label main = $013E
; label __zax_epilogue_1 = $0159
; data glob_bytes = $2000
; label __zax_startup = $2008
