; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_const begin
byte_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld E, (IX + $0004)             ; 010E: DD 5E 04
ld D, (IX + $0005)             ; 0111: DD 56 05
ex DE, HL                      ; 0114: EB
ld DE, $0002                   ; 0115: 11 02 00
add HL, DE                     ; 0118: 19
push HL                        ; 0119: E5
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
ld A, (hl)                     ; 011E: 7E
push AF                        ; 011F: F5
push BC                        ; 0120: C5
push DE                        ; 0121: D5
ld E, (IX + $0004)             ; 0122: DD 5E 04
ld D, (IX + $0005)             ; 0125: DD 56 05
ex DE, HL                      ; 0128: EB
ld DE, $0003                   ; 0129: 11 03 00
add HL, DE                     ; 012C: 19
push HL                        ; 012D: E5
pop HL                         ; 012E: E1
pop DE                         ; 012F: D1
pop BC                         ; 0130: C1
pop AF                         ; 0131: F1
ld (hl), A                     ; 0132: 77
ld H, $0000                    ; 0133: 26 00
ld L, A                        ; 0135: 6F
__zax_epilogue_0:
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func byte_fvar_const end
; func main begin
main:
push IX                        ; 013E: DD E5
ld IX, $0000                   ; 0140: DD 21 00 00
add IX, SP                     ; 0144: DD 39
push AF                        ; 0146: F5
push BC                        ; 0147: C5
push DE                        ; 0148: D5
push HL                        ; 0149: E5
ld HL, glob_bytes              ; 014A: 21 00 00
push HL                        ; 014D: E5
call byte_fvar_const           ; 014E: CD 00 00
inc SP                         ; 0151: 33
inc SP                         ; 0152: 33
__zax_epilogue_1:
pop HL                         ; 0153: E1
pop DE                         ; 0154: D1
pop BC                         ; 0155: C1
pop AF                         ; 0156: F1
ld SP, IX                      ; 0157: DD F9
pop IX                         ; 0159: DD E1
ret                            ; 015B: C9
; func main end

; symbols:
; label byte_fvar_const = $0100
; label __zax_epilogue_0 = $0136
; label main = $013E
; label __zax_epilogue_1 = $0153
; data glob_bytes = $2000
; label __zax_startup = $2008
