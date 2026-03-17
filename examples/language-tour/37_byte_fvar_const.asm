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
push HL                        ; 010C: E5
ld E, (IX + $0004)             ; 010D: DD 5E 04
ld D, (IX + $0005)             ; 0110: DD 56 05
ex DE, HL                      ; 0113: EB
ld DE, $0002                   ; 0114: 11 02 00
add HL, DE                     ; 0117: 19
push HL                        ; 0118: E5
pop HL                         ; 0119: E1
ld A, (hl)                     ; 011A: 7E
push AF                        ; 011B: F5
ld E, (IX + $0004)             ; 011C: DD 5E 04
ld D, (IX + $0005)             ; 011F: DD 56 05
ex DE, HL                      ; 0122: EB
ld DE, $0003                   ; 0123: 11 03 00
add HL, DE                     ; 0126: 19
push HL                        ; 0127: E5
pop HL                         ; 0128: E1
ld (hl), A                     ; 0129: 77
pop AF                         ; 012A: F1
pop HL                         ; 012B: E1
pop AF                         ; 012C: F1
ld E, (IX + $0004)             ; 012D: DD 5E 04
ld D, (IX + $0005)             ; 0130: DD 56 05
ex DE, HL                      ; 0133: EB
ld DE, $0002                   ; 0134: 11 02 00
add HL, DE                     ; 0137: 19
push HL                        ; 0138: E5
pop HL                         ; 0139: E1
ld A, (hl)                     ; 013A: 7E
ld H, $0000                    ; 013B: 26 00
ld L, A                        ; 013D: 6F
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func byte_fvar_const end
; func main begin
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, glob_bytes              ; 0152: 21 00 00
push HL                        ; 0155: E5
call byte_fvar_const           ; 0156: CD 00 00
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
__zax_epilogue_1:
pop HL                         ; 015B: E1
pop DE                         ; 015C: D1
pop BC                         ; 015D: C1
pop AF                         ; 015E: F1
ld SP, IX                      ; 015F: DD F9
pop IX                         ; 0161: DD E1
ret                            ; 0163: C9
; func main end

; symbols:
; label byte_fvar_const = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $015B
; data glob_bytes = $2000
; label __zax_startup = $2008
